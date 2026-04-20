package sync

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// PatchAgentStatus notifies the Forge API to update the agent's k8sStatus in postgres.
// Called by the reconciler after every successful status change.
// The API's /internal route is protected by NetworkPolicy — only reachable from within the cluster.
func PatchAgentStatus(apiBaseURL, agentID, phase string) error {
	url := strings.TrimRight(apiBaseURL, "/") + "/internal/agents/" + agentID + "/k8s-status"

	body, err := json.Marshal(map[string]string{"phase": phase})
	if err != nil {
		return fmt.Errorf("marshal phase body: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return fmt.Errorf("POST %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status %d from %s", resp.StatusCode, url)
	}

	return nil
}
