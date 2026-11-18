// Runs before first paint (kept as an external file because the CSP forbids inline scripts).
(function () {
  try {
    var pref = localStorage.getItem("aidos_theme") || "dark";
    var light = pref === "light" || (pref === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
