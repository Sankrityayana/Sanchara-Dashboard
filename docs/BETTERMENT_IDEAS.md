# Betterment Ideas

1. **Single-port production backend**
   - Serve REST and WebSocket traffic from the same HTTP server for easier Render/Railway/Fly deployment.

2. **README screenshots and GIF**
   - Add dashboard screenshots and a short scenario-control GIF so recruiters can understand the project without running it.

3. **Real InfluxDB history charts**
   - Use InfluxDB for chart ranges by default when configured, with clear UI state for memory vs persisted history.

4. **Alert rule configuration**
   - Move battery and temperature thresholds into a config file so rules are easy to tune and explain.

5. **Geofence alerts**
   - Add a simple geofence and alert when a vehicle leaves the allowed area.

6. **Route replay controls**
   - Add play/pause/scrub controls for route history on the map.

7. **Authentication**
   - Add a simple login and protect fleet APIs with user/org-level access.

8. **Observability dashboard**
   - Visualize messages per second, connected clients, API requests, and dropped telemetry inside the UI.

9. **Playwright visual smoke test**
   - Add a browser test that confirms dashboard render, scenario buttons, and alert display.

10. **Production deployment**
   - Deploy frontend to Vercel and backend to Render/Railway/Fly, then add live links to the README and portfolio.
