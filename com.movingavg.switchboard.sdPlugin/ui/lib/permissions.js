// Shared property-inspector helper: shows a live "Accessibility not granted"
// warning at the top of the inspector when this action lacks AX trust, and
// hides it once granted. Include from any PI that needs Accessibility:
//
//   <script src="lib/permissions.js"></script>
//
// It self-injects the banner DOM (so PIs only add the one tag), asks the plugin
// to check on load, re-checks on a button press, and updates on the reply. The
// plugin side answers `checkAccessibility` via respondToAccessibilityCheck().
(function () {
	function whenReady(cb) {
		var client = window.SDPIComponents && window.SDPIComponents.streamDeckClient;
		if (client) {
			cb(client);
		} else {
			setTimeout(function () {
				whenReady(cb);
			}, 50);
		}
	}

	whenReady(function (client) {
		var bar = document.createElement("div");
		bar.id = "sb-accessibility-warning";
		bar.style.cssText =
			"display:none;margin:0 0 12px;padding:10px 12px;border:1px solid #c79100;" +
			"background:#3a2f00;border-radius:6px;font-size:12px;color:#ffd96b;line-height:1.45;";
		bar.innerHTML =
			'<div style="font-weight:600;margin-bottom:4px;">⚠️ Accessibility permission not granted</div>' +
			"This action controls windows and sends keystrokes, which needs Accessibility access. " +
			"Open <b>System Settings → Privacy &amp; Security → Accessibility</b>, enable " +
			"<b>Stream Deck</b>, then quit and relaunch Stream Deck." +
			'<div style="margin-top:8px;"><button id="sb-recheck" type="button" ' +
			'style="font:inherit;color:#1d1d1f;background:#ffd96b;border:0;border-radius:4px;' +
			'padding:4px 10px;cursor:pointer;">Re-check</button></div>';

		function mount() {
			if (document.body) {
				document.body.insertBefore(bar, document.body.firstChild);
			} else {
				setTimeout(mount, 50);
			}
		}
		mount();

		function request() {
			client.send("sendToPlugin", { event: "checkAccessibility" });
		}

		client.sendToPropertyInspector.subscribe(function (e) {
			var p = e && e.payload;
			if (!p || p.event !== "checkAccessibility") return;
			bar.style.display = p.trusted ? "none" : "";
		});

		bar.querySelector("#sb-recheck").addEventListener("click", request);

		request();
		// A second nudge in case the first request raced PI/socket init.
		setTimeout(request, 600);
	});
})();
