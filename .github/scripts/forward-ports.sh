#!/usr/bin/env bash
set -euo pipefail

# Built-in SOLO port forwarding does not work :/
# Port forwarding stops shortly after a one-shot Falcon start in GitHub actions.
# For this reason, we use this script to start port forwarding directly via Bash,
# instead of relying on the Node.js script.
# This approach keeps the connection stable and ensures it lasts throughout the tests.

FORWARDS=(
  "mirror-ingress-controller|5551:80"
  "network-node1|50211:50211"
  "relay-1|7546:7546"
  "mirror-1-grpc|5600:5600"
)

ps aux | grep "port-forward" | grep kubectl | awk '{print $2}' | xargs -r kill -9

# solo 0.84 names the deployment namespace after the runner (e.g. rss-<runner>),
# so derive it from where the consensus node pod runs instead of hardcoding a name.
NS="$(kubectl get pods -A --no-headers | grep -E 'network-node' | head -n1 | awk '{print $1}')"

listen() {
  local pod="$1"
  local ports="$2"
  (
    while true; do
      if ! ps aux | grep -F kubectl | grep -F port-forward | grep -F " ${ports}" | grep -v grep >/dev/null; then
        kubectl port-forward --address 0.0.0.0 "$pod" -n "$NS" "${ports}" >/dev/null 2>&1 &
      fi
      sleep 1
    done
  ) &
}

for row in "${FORWARDS[@]}"; do
  IFS='|' read -r include ports <<<"$row"
  # grep -v '-ws-' excludes the websocket relay pod (relay-1-ws-*) so we match the JSON-RPC relay
  POD="$(kubectl get pods -n "$NS" --no-headers | grep -E "$include" | grep -v -- '-ws-' | head -n 1 | awk '{print $1}')"
  listen "$POD" "$ports"
done
