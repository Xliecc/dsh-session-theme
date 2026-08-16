window.__ModuleLoader__.load({
	id: "dsh-session-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/**
		 * dsh-session-theme — client half is a no-op stub.
		 * All behavior lives in the host half (lib/index.js): warming the
		 * session projection cache so the sidebar shows every session's theme
		 * on load. This stub keeps the registered browser module valid.
		 */
		const inject = [];
		function apply() {}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});