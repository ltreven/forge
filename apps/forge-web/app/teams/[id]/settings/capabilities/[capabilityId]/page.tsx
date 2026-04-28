"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, X, Plus, Save, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Capability {
  id: string; name: string; identifier: string; instructions: string; triggers: string[] | null;
  inputsDescription: string | null; expectedOutputsDescription: string | null;
  expectedEventsOutput: string[] | null; suggestedNextCapabilities: string[] | null; isEnabled: boolean; scheduleConfig: Record<string, any> | null;
  assignedAgentId: string | null; assignedRole: string | null; isFavorite: boolean;
}

function SmartEventSelect({ 
  value, 
  onChange, 
  availableEvents 
}: { 
  value: string[] | null, 
  onChange: (val: string[] | null) => void, 
  availableEvents: { identifier: string }[] 
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentValues = value || [];
  
  const cleanInput = inputValue.trim().toLowerCase();
  
  const filteredEvents = availableEvents.filter(e => 
    !currentValues.includes(e.identifier) && 
    e.identifier.toLowerCase().includes(cleanInput)
  );
  
  const isExactMatch = availableEvents.some(e => e.identifier === cleanInput) || currentValues.includes(cleanInput);
  const showCreateNew = cleanInput.length > 0 && !isExactMatch;

  const handleAdd = (id: string) => {
    onChange([...currentValues, id]);
    setInputValue("");
    inputRef.current?.focus();
  };
  
  const handleRemove = (id: string) => {
    const next = currentValues.filter(v => v !== id);
    onChange(next.length > 0 ? next : null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cleanInput) {
      e.preventDefault();
      if (filteredEvents.length > 0 && !showCreateNew) {
        handleAdd(filteredEvents[0].identifier);
      } else if (showCreateNew) {
        handleAdd(cleanInput);
      }
    } else if (e.key === 'Backspace' && !inputValue && currentValues.length > 0) {
      handleRemove(currentValues[currentValues.length - 1]);
    }
  };

  return (
    <div className="relative flex flex-col w-full">
      <div 
        className={cn(
          "flex flex-wrap gap-1.5 p-1.5 w-full rounded-md border bg-transparent min-h-[36px] text-sm shadow-sm transition-colors",
          isFocused ? "border-primary ring-1 ring-primary" : "border-input"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {currentValues.map(v => {
          const isKnown = availableEvents.some(e => e.identifier === v);
          return (
            <span key={v} className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-default",
              isKnown ? "bg-muted text-foreground border" : "bg-primary/20 text-primary border border-primary/30"
            )}>
              {v}
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={currentValues.length === 0 ? "Search or create..." : ""}
          className="flex-1 bg-transparent outline-none min-w-[120px] px-1 text-sm placeholder:text-muted-foreground"
        />
      </div>
      
      {isFocused && (inputValue || filteredEvents.length > 0) && (
        <div className="absolute top-full mt-1 w-full bg-card border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredEvents.map(e => (
            <div 
              key={e.identifier} 
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center gap-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(e.identifier)}
            >
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              {e.identifier}
            </div>
          ))}
          {showCreateNew && (
            <div 
              className="px-3 py-2 text-sm text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-2 border-t"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(cleanInput)}
            >
              <Plus className="size-3" />
              Create new event: <span className="font-bold">{cleanInput}</span>
            </div>
          )}
          {filteredEvents.length === 0 && !showCreateNew && (
            <div className="px-3 py-2 text-sm text-muted-foreground italic" onMouseDown={(e) => e.preventDefault()}>No matches found. Type to create new.</div>
          )}
        </div>
      )}
    </div>
  );
}

function SmartCapabilitySelect({ 
  value, 
  onChange, 
  availableCapabilities 
}: { 
  value: string[] | null, 
  onChange: (val: string[] | null) => void, 
  availableCapabilities: Capability[] 
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentValues = value || [];
  const cleanInput = inputValue.trim().toLowerCase();
  
  const filteredCaps = availableCapabilities.filter(c => 
    !currentValues.includes(c.identifier) && 
    (c.name.toLowerCase().includes(cleanInput) || c.identifier.toLowerCase().includes(cleanInput))
  );

  const handleAdd = (id: string) => {
    onChange([...currentValues, id]);
    setInputValue("");
    inputRef.current?.focus();
  };
  
  const handleRemove = (id: string) => {
    const next = currentValues.filter(v => v !== id);
    onChange(next.length > 0 ? next : null);
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
          "flex flex-wrap gap-1.5 p-1.5 w-full rounded-md border bg-transparent min-h-[36px] text-sm shadow-sm transition-colors",
          isFocused ? "border-primary ring-1 ring-primary" : "border-input"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {currentValues.map(v => {
          const cap = availableCapabilities.find(c => c.identifier === v);
          return (
            <span key={v} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-default bg-muted text-foreground border">
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={currentValues.length === 0 ? "Search capabilities..." : ""}
          className="flex-1 bg-transparent outline-none min-w-[120px] px-1 text-sm placeholder:text-muted-foreground"
        />
      </div>
      
      {isFocused && (inputValue || filteredCaps.length > 0) && (
        <div className="absolute top-full mt-1 w-full bg-card border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredCaps.map(c => (
            <div 
              key={c.identifier} 
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex flex-col"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(c.identifier)}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{c.identifier}</span>
            </div>
          ))}
          {filteredCaps.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground italic" onMouseDown={(e) => e.preventDefault()}>No matching capabilities.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CapabilityPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params.id);
  const capabilityId = String(params.capabilityId);
  const isNew = capabilityId === "new";

  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<{id: string, name: string, type: string}[]>([]);
  const [teamEvents, setTeamEvents] = useState<{identifier: string}[]>([]);
  const [allCapabilities, setAllCapabilities] = useState<Capability[]>([]);
  const [capability, setCapability] = useState<Capability>({
    id: "new", name: "", identifier: "", instructions: "", inputsDescription: "", 
    expectedOutputsDescription: "", triggers: null, expectedEventsOutput: null, 
    suggestedNextCapabilities: null, isEnabled: true, scheduleConfig: null, 
    assignedAgentId: null, assignedRole: null, isFavorite: false
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [agentsRes, evRes, capsRes] = await Promise.all([
        fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers }),
        fetch(`${API_BASE}/teams/${teamId}/events`, { headers }),
        fetch(`${API_BASE}/teams/${teamId}/capabilities`, { headers })
      ]);

      if (agentsRes.ok) setAgents((await agentsRes.json()).data || []);
      if (evRes.ok) setTeamEvents((await evRes.json()).data || []);
      
      let capabilitiesList: Capability[] = [];
      if (capsRes.ok) {
        capabilitiesList = (await capsRes.json()).data || [];
        setAllCapabilities(capabilitiesList);
      }

      if (!isNew) {
        const existingCap = capabilitiesList.find(c => c.id === capabilityId);
        if (existingCap) {
          setCapability(existingCap);
        } else {
          // Fallback fetch if not in the list (though the list should contain it)
          const singleRes = await fetch(`${API_BASE}/teams/${teamId}/capabilities/${capabilityId}`, { headers });
          if (singleRes.ok) {
            setCapability((await singleRes.json()).data);
          } else {
            toast.error("Capability not found.");
            router.push(`/teams/${teamId}/settings`);
          }
        }
      }
    } catch (err) { 
      toast.error("Failed to load capability data."); 
    } finally { 
      setIsLoading(false); 
    }
  }, [teamId, capabilityId, isNew, token, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!token) router.replace("/login");
      else fetchData();
    }
  }, [authLoading, token, fetchData, router]);

  const saveCapability = async () => {
    if (!token) return;
    try {
      const url = isNew ? `${API_BASE}/teams/${teamId}/capabilities` : `${API_BASE}/teams/${teamId}/capabilities/${capabilityId}`;
      const method = isNew ? "POST" : "PUT";
      
      // Filter out 'id' from payload for updates if it causes issues, but backend usually ignores it.
      const payload = {
        name: capability.name,
        identifier: capability.identifier,
        instructions: capability.instructions,
        inputsDescription: capability.inputsDescription,
        expectedOutputsDescription: capability.expectedOutputsDescription,
        triggers: capability.triggers,
        expectedEventsOutput: capability.expectedEventsOutput,
        suggestedNextCapabilities: capability.suggestedNextCapabilities,
        isEnabled: capability.isEnabled,
        isFavorite: capability.isFavorite,
        scheduleConfig: capability.scheduleConfig,
        assignedAgentId: capability.assignedAgentId,
        assignedRole: capability.assignedRole
      };

      const res = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`Capability ${isNew ? 'created' : 'updated'}`);
        router.push(`/teams/${teamId}/settings`);
      } else {
        toast.error("Failed to save capability");
      }
    } catch (e) { 
      toast.error("Failed to save capability"); 
    }
  };

  if (authLoading || isLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4">
        <Link href={`/teams/${teamId}/settings`} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="size-3.5" /> Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                {isNew ? "New Capability" : "Edit Capability"}
                <button
                  type="button"
                  onClick={() => setCapability({ ...capability, isFavorite: !capability.isFavorite })}
                  className="text-muted-foreground hover:text-amber-500 transition-colors"
                  title="Mark as favorite"
                >
                  <Star className={cn("size-6 mt-1", capability.isFavorite ? "fill-amber-500 text-amber-500" : "")} />
                </button>
              </h1>
              <p className="mt-1 text-muted-foreground text-sm">Configure instructions, triggers, and execution details.</p>
            </div>
          </div>
          <Button onClick={saveCapability} className="gap-2">
            <Save className="size-4" /> Save Capability
          </Button>
        </div>
      </div>

      <div className="space-y-8 pb-20">
        
        {/* 1. Name & Identifier */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={capability.name} onChange={e => {
                const newName = e.target.value;
                const oldSlug = capability.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)+/g, '');
                const newSlug = newName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)+/g, '');
                if (!capability.identifier || capability.identifier === oldSlug) {
                  setCapability({...capability, name: newName, identifier: newSlug});
                } else {
                  setCapability({...capability, name: newName});
                }
              }} placeholder="e.g. Write User Story" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identifier</label>
              <Input value={capability.identifier} onChange={e => {
                const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                setCapability({...capability, identifier: sanitized});
              }} placeholder="e.g. write-user-story" />
            </div>
          </div>
        </div>

        {/* 2. Triggered By + Inputs */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Origin & Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between items-center">
                <span>Triggered By</span>
                <span className="text-[10px] text-muted-foreground font-normal">Events that start this</span>
              </label>
              <SmartEventSelect 
                value={capability.triggers || []} 
                onChange={v => setCapability({...capability, triggers: v})} 
                availableEvents={teamEvents} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between items-center">
                <span>Inputs</span>
                <span className="text-[10px] text-muted-foreground font-normal">Required format/data</span>
              </label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]" 
                value={capability.inputsDescription || ""} 
                onChange={e => setCapability({...capability, inputsDescription: e.target.value})} 
                placeholder="What data does this capability expect to receive?"
              />
            </div>
          </div>
        </div>

        {/* 3. Instructions */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Behavior</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Instructions</label>
            <p className="text-xs text-muted-foreground mb-2">Describe step-by-step what the agent should do when executing this capability.</p>
            <textarea 
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[160px]" 
              value={capability.instructions} 
              onChange={e => setCapability({...capability, instructions: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Expected Output (Description)</label>
            <p className="text-xs text-muted-foreground mb-2">What is the acceptance criteria or expected outcome?</p>
            <textarea 
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]" 
              value={capability.expectedOutputsDescription || ""} 
              onChange={e => setCapability({...capability, expectedOutputsDescription: e.target.value})} 
            />
          </div>
        </div>

        {/* 4. Produced Events & Suggested Next Capabilities */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Outputs & Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between items-center">
                <span>Produced Events</span>
                <span className="text-[10px] text-muted-foreground font-normal">Fired upon completion</span>
              </label>
              <SmartEventSelect 
                value={capability.expectedEventsOutput || []} 
                onChange={v => setCapability({...capability, expectedEventsOutput: v})} 
                availableEvents={teamEvents} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between items-center">
                <span>Suggested Next</span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional next steps</span>
              </label>
              <SmartCapabilitySelect 
                value={capability.suggestedNextCapabilities || []} 
                onChange={v => setCapability({...capability, suggestedNextCapabilities: v})} 
                availableCapabilities={allCapabilities.filter(c => c.id !== capability.id)}
              />
            </div>
          </div>
        </div>

        {/* 5. Schedule & Assignment */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Execution Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-medium">Who can execute this?</label>
              <div className="flex flex-col gap-3">
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={capability.assignedAgentId ? 'agent' : (capability.assignedRole ? 'role' : 'any')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'any') setCapability({...capability, assignedAgentId: null, assignedRole: null});
                    else if (val === 'agent') setCapability({...capability, assignedAgentId: agents[0]?.id || "", assignedRole: null});
                    else if (val === 'role') {
                      const uniqueRoles = Array.from(new Set(agents.map(a => a.type)));
                      setCapability({...capability, assignedAgentId: null, assignedRole: uniqueRoles[0] || ""});
                    }
                  }}
                >
                  <option value="any">Anyone (First available)</option>
                  <option value="agent">Specific Agent</option>
                  <option value="role">Specific Role</option>
                </select>
                
                {capability.assignedAgentId !== null && (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={capability.assignedAgentId || ""}
                    onChange={e => setCapability({...capability, assignedAgentId: e.target.value, assignedRole: null})}
                  >
                    <option value="" disabled>Select agent...</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                
                {capability.assignedRole !== null && (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={capability.assignedRole || ""}
                    onChange={e => setCapability({...capability, assignedRole: e.target.value, assignedAgentId: null})}
                  >
                    <option value="" disabled>Select role...</option>
                    {Array.from(new Set(agents.map(a => a.type))).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pt-1">
                <label className="text-sm font-medium">Routine Schedule</label>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={!!capability.scheduleConfig} onChange={(e) => setCapability({...capability, scheduleConfig: e.target.checked ? { cron: "0 0 * * *" } : null})} />
                    <div className={cn("block w-10 h-6 rounded-full transition-colors", capability.scheduleConfig ? "bg-primary" : "bg-muted-foreground/30")}></div>
                    <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", capability.scheduleConfig && "transform translate-x-4")}></div>
                  </div>
                </label>
              </div>
              
              {capability.scheduleConfig && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs text-muted-foreground">Cron Expression</label>
                  <Input 
                    placeholder="e.g. 0 0 * * * (Daily at midnight)" 
                    value={capability.scheduleConfig.cron || ""} 
                    onChange={e => setCapability({...capability, scheduleConfig: { ...capability.scheduleConfig, cron: e.target.value }})} 
                  />
                  <p className="text-[10px] text-muted-foreground">Use standard cron format. Times are evaluated in UTC.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
