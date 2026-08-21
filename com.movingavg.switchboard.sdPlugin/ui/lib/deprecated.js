// Shared property-inspector helper: shows a static "superseded by AI Project"
// notice at the top of the inspector. Include from any PI whose action is on
// the way out:
//
//   <script src="lib/deprecated.js"></script>
//
// Like lib/permissions.js it self-injects the banner DOM, so PIs only add the
// one tag. Unlike it, there is nothing to ask the plugin — the action IS
// deprecated, unconditionally — so there is no round-trip, no re-check button,
// and the banner is always visible.
//
// Deliberately INFORMATIONAL, not a warning: these actions still work. The
// styling is neutral blue rather than the amber permissions.js uses for a real
// problem, because nothing here is broken.
//
// Delete this file together with the superseded actions.
(function () {
	function mount() {
		if (!document.body) {
			setTimeout(mount, 50);
			return;
		}
		var bar = document.createElement("div");
		bar.id = "sb-deprecated-notice";
		bar.style.cssText =
			"margin:0 0 12px;padding:10px 12px;border:1px solid #3d6ea8;" +
			"background:#152532;border-radius:6px;font-size:12px;color:#bcd9f5;line-height:1.45;";
		bar.innerHTML =
			'<div style="font-weight:600;margin-bottom:4px;">' +
			"This action is superseded by &ldquo;AI Project&rdquo;</div>" +
			"One key now covers Claude Code, Codex and Cursor, detecting which agent it is " +
			"looking at. To move over:" +
			'<ol style="margin:6px 0 0;padding-left:18px;">' +
			"<li>Drag an <b>AI Project</b> action onto a key.</li>" +
			"<li>Hold that key for &frac12;&nbsp;second while this agent's terminal is " +
			"frontmost, to capture the session.</li>" +
			"<li>Delete this key.</li>" +
			"</ol>" +
			'<div style="margin-top:8px;">This action still works as before. It will be ' +
			"removed in a future release.</div>";
		document.body.insertBefore(bar, document.body.firstChild);
	}
	mount();
})();
