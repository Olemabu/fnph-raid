// Storage (adapted from Radius Raid): safe wrapper, the page must work without localStorage
$.setupStorage = function() {
	var d = { 'mute': 0, 'autofire': 0, 'score': 0, 'level': 0, 'rounds': 0, 'kills': 0, 'bullets': 0, 'powerups': 0, 'time': 0 };
	try { $.storage = JSON.parse( localStorage.getItem( 'fnphraid.engine' ) ) || d; } catch( e ) { $.storage = d; }
};
$.updateStorage = function() { try { localStorage.setItem( 'fnphraid.engine', JSON.stringify( $.storage ) ); } catch( e ) {} };
