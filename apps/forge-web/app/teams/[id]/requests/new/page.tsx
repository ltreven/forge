"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SmartCapabilitySelect({ 
  value, 
  onChange, 
  availableCapabilities 
}: { 
  value: string[], 
  onChange: (val: string[]) => void, 
  availableCapabilities: { identifier: string; name: string }[] 
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentValues = value || [];
  
  const cleanInput = inputValue.trim().toLowerCase();
  
  const filteredCaps = availableCapabilities.filter(c => 
    !currentValues.includes(c.identifier) && 
    (c.identifier.toLowerCase().includes(cleanInput) || c.name.toLowerCase().includes(cleanInput))
  );

  const handleAdd = (id: string) => {
    onChange([...currentValues, id]);
    setInputValue("");
    inputRef.current?.focus();
  };
  
  const handleRemove = (id: string) => {
    const next = currentValues.filter(v => v !== id);
    onChange(next);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cleanInput) {
      e.preventDefault();
      if (filteredCaps.length > 0) {
        handleAdd(filteredCaps[0].identifier);
      }
    } else if (e.key === 'Backspace' && !inputValue && currentValues.length > 0) {
      handleRemove(currentValues[currentValues.length - 1]);
    }
  };

  return (
    <div className="relative flex flex-col w-full">
      <div 
        className={cn(
          "flex flex-wrap gap-1.5 p-1.5 w-full rounded-md border bg-transparent min-h-[40px] text-sm shadow-sm transition-colors",
          isFocused ? "border-primary ring-1 ring-primary" : "border-input"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {currentValues.map(v => {
          const cap = availableCapabilities.find(c => c.identifier === v);
          return (
            <span key={v} className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-default",
              cap ? "bg-muted text-foreground border" : "bg-primary/20 text-primary border border-primary/30"
            )}>
              {cap ? cap.name : v}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); handleRemove(v); }}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          className="flex-1 min-w-[120px] bg-transparent outline-none px-1 py-0.5 text-sm"
          placeholder={currentValues.length === 0 ? "Type capability identifier or name..." : ""}
        />
      </div>

      {isFocused && (inputValue || filteredCaps.length > 0) && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden max-h-[200px] overflow-y-auto">
          {filteredCaps.map(cap => (
            <div 
              key={cap.identifier}
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex justify-between items-center"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(cap.identifier)}
            >
              <span>{cap.name}</span>
              <span className="text-xs text-muted-foreground">{cap.identifier}</span>
            </div>
          ))}
          {filteredCaps.length === 0 && inputValue && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              No matching capabilities
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewRequestPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const capabilityIdParam = searchParams?.get("capabilityId");
  const requestIdParam = searchParams?.get("requestId");
  const router = useRouter();
  const teamId = String(params.id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [selectedCapabilityInfo, setSelectedCapabilityInfo] = useState<any>(null);

  // Form State
  const [targetType, setTargetType] = useState<"anyone" | "agent" | "role">("anyone");
  const [targetAgentId, setTargetAgentId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestCapabilities, setRequestCapabilities] = useState<string[]>([]);
  
  // UI State
  const [showAdvancedTarget, setShowAdvancedTarget] = useState(false);
  const [isLeaderThinking, setIsLeaderThinking] = useState(false);
  const [leaderThought, setLeaderThought] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers }),
      fetch(`${API_BASE}/meta/agent-roles`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/capabilities`, { headers }),
      requestIdParam ? fetch(`${API_BASE}/teams/${teamId}/requests/${requestIdParam}`, { headers }) : Promise.resolve(null)
    ]).then(async ([agentsRes, rolesRes, capsRes, reqRes]) => {
      let loadedAgents = [];
      let loadedCaps = [];
      if (agentsRes.ok) loadedAgents = (await agentsRes.json()).data ?? [];
      if (rolesRes.ok) setRoles((await rolesRes.json()).data ?? []);
      if (capsRes.ok) loadedCaps = (await capsRes.json()).data ?? [];
      
      setAgents(loadedAgents);
      setCapabilities(loadedCaps);

      let loadedRequest = null;
      if (reqRes && reqRes.ok) {
         loadedRequest = (await reqRes.json()).data;
      }

      if (loadedRequest) {
        // Populate from existing draft
        setRequestDetails(loadedRequest.requestDetails || "");
        setRequestCapabilities(loadedRequest.requestCapabilities || []);
        if (loadedRequest.targetAgentId) {
          setTargetType("agent");
          setTargetAgentId(loadedRequest.targetAgentId);
        } else if (loadedRequest.targetRole) {
          setTargetType("role");
          setTargetRole(loadedRequest.targetRole);
        } else {
          setTargetType("anyone");
        }
      } else {
        // Auto-assign team lead if available
        const lead = loadedAgents.find((a: any) => a.type === "team_lead");
        if (lead) {
          setTargetType("agent");
          setTargetAgentId(lead.id);
        }

        // Handle URL capability
        if (capabilityIdParam && loadedCaps.length > 0) {
          const cap = loadedCaps.find((c: any) => c.id === capabilityIdParam);
          if (cap) {
            setRequestCapabilities([cap.identifier]);
            setSelectedCapabilityInfo(cap);
            if (cap.inputsDescription) {
              setRequestDetails(`Request:\nPlease provide the following inputs:\n${cap.inputsDescription}`);
            }
          }
        }
      }
    });
  }, [authLoading, token, teamId, capabilityIdParam, requestIdParam]);

  // Fake AI Thinking Logic
  const handleDetailsChange = (value: string) => {
    setRequestDetails(value);
    setLeaderThought(null);
    setIsLeaderThinking(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsLeaderThinking(false);
      const cleanValue = value.trim();
      if (!cleanValue) {
        setLeaderThought(null);
        return;
      }
      
      if (cleanValue.length < 25 && !selectedCapabilityInfo) {
        setLeaderThought("I can probably answer this for you right now without creating a formal request...");
      } else {
        setLeaderThought("Looks good. Let's submit to the team.");
      }
    }, 2000);
  };
  
  // Also trigger thinking when capabilities change
  useEffect(() => {
    if (!authLoading && requestCapabilities.length > 0) {
      setLeaderThought(null);
      setIsLeaderThinking(true);
      const to = setTimeout(() => {
        setIsLeaderThinking(false);
        setLeaderThought("I have updated the execution plan based on the selected capabilities. Looks good.");
      }, 1500);
      return () => clearTimeout(to);
    }
  }, [requestCapabilities, authLoading]);

  const handleSubmit = async (status: "draft" | "open") => {
    if (!requestDetails.trim()) {
      toast.error("Please provide request details.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-generate title
      const cleanDesc = requestDetails.replace(/^Request:\nPlease provide the following inputs:\n/, "").trim();
      const words = cleanDesc.split(/\s+/);
      const generatedTitle = words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
      const finalTitle = generatedTitle || "New Request";

      const endpoint = requestIdParam 
        ? `${API_BASE}/teams/${teamId}/requests/${requestIdParam}`
        : `${API_BASE}/teams/${teamId}/requests`;
      
      const method = requestIdParam ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: finalTitle,
          targetAgentId: targetType === "agent" ? targetAgentId || null : null,
          targetRole: targetType === "role" ? targetRole || null : null,
          requestDetails,
          requestCapabilities,
          status
        }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || `Failed to ${requestIdParam ? "update" : "create"} request`);
      }

      toast.success(`Request ${status === "draft" ? "saved as draft" : "created successfully"}`);
      router.push(`/teams/${teamId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadAgent = agents.find(a => a.type === "team_lead");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href={`/teams/${teamId}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-3.5" />
        Back to Team
      </Link>

      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {selectedCapabilityInfo ? selectedCapabilityInfo.name : "Ask the team anything"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {selectedCapabilityInfo ? "Fill in the details below to start this capability." : "What would you like to ask or request?"}
        </p>
      </div>

      <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">

        <div className="space-y-3">
          <Label htmlFor="requestDetails" className="sr-only">Details of what you'd like done</Label>
          <textarea
            id="requestDetails"
            className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
            placeholder="Provide context, references, or instructions for the team..."
            value={requestDetails}
            onChange={e => handleDetailsChange(e.target.value)}
            autoFocus
          />
        </div>

        {/* AI Thoughts Area */}
        <div className="min-h-[60px] flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex size-10 items-center justify-center rounded-full bg-background border shadow-sm text-lg shrink-0 mt-0.5">
            {leadAgent?.icon || "👑"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary mb-1 block">{leadAgent?.name || "Team Lead"}</span>
            {isLeaderThinking ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground italic h-6">
                <span className="flex gap-0.5">
                  <span className="animate-bounce delay-75">.</span>
                  <span className="animate-bounce delay-150">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </span>
                analyzing request
              </div>
            ) : leaderThought ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <p className="text-sm text-foreground leading-relaxed">{leaderThought}</p>
                
                {selectedCapabilityInfo?.expectedOutputsDescription && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">What you should expect as a result:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedCapabilityInfo.expectedOutputsDescription}</p>
                  </div>
                )}
                
                {selectedCapabilityInfo?.instructions && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">We will use these instructions or guidelines to deliver your work:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedCapabilityInfo.instructions}</p>
                  </div>
                )}
                
                {requestCapabilities.length > 0 && (
                  <p className="text-sm text-foreground pt-1">
                    And see below some suggested capabilities to better reach the objectives.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic h-6 flex items-center">Waiting for your input...</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Assigned to:</span>
              <span className="text-sm font-medium">
                {targetType === "agent" && targetAgentId 
                  ? agents.find(a => a.id === targetAgentId)?.name || "Agent"
                  : targetType === "role" && targetRole 
                    ? roles.find(r => r.id === targetRole)?.name || "Role"
                    : "Auto-assign"}
              </span>
              <button 
                onClick={() => setShowAdvancedTarget(!showAdvancedTarget)}
                className="text-xs text-primary hover:underline ml-1"
              >
                Change
              </button>
            </div>
          </div>

          {showAdvancedTarget && (
            <div className="flex gap-4 animate-in slide-in-from-top-2 p-3 bg-muted/20 rounded-md border">
              <select
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                value={targetType}
                onChange={e => setTargetType(e.target.value as any)}
              >
                <option value="anyone">Anyone (Auto-assign)</option>
                <option value="agent">Specific Agent</option>
                <option value="role">Specific Role</option>
              </select>

              {targetType === "agent" && (
                <select
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                  value={targetAgentId}
                  onChange={e => setTargetAgentId(e.target.value)}
                >
                  <option value="" disabled>Select an Agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type.replace('_', ' ')})</option>
                  ))}
                </select>
              )}

              {targetType === "role" && (
                <select
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                >
                  <option value="" disabled>Select a Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Suggested Capabilities</Label>
            <SmartCapabilitySelect 
              value={requestCapabilities}
              onChange={setRequestCapabilities}
              availableCapabilities={capabilities}
            />
          </div>

        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground"
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
          >
            <Save className="size-4 mr-2" />
            Save as draft
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/teams/${teamId}`}>Cancel</Link>
            </Button>
            <Button 
              onClick={() => handleSubmit("open")}
              disabled={isSubmitting || !requestDetails.trim()}
              className="px-8 shadow-md"
            >
              <Send className="size-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
