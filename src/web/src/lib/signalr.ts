import * as signalR from "@microsoft/signalr";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function createHubConnection(hubPath: string) {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}${hubPath}`, {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect()
    .build();
}
