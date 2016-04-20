var map,
    infoWindow, //pop-up information about the locations when the user clicks the marker or from the list
    initialLocations,
    mapViewModel,
    detailsViewModel;

// Make sure loadGoogleMapsAPI is the first function called when the window is loaded
window.onload = loadGoogleMapsAPI;

// Loads the Google Maps API. If sucessful, it calls the initialize function.
function loadGoogleMapsAPI() {
    //getJSONP is found at the end of this file
    getJSONP('https://maps.googleapis.com/maps/api/js?key=AIzaSyAh7f-89owQdNx-ihJWQcnZWL6XP9gcqdQ', initialize, onErrorCallback);
    function onErrorCallback(event) {
        if (navigator.onLine) {
            createErrorMessage('The Google Maps API cannot be reached.');
        } else {
            createErrorMessage('Please check your internet connection, then refresh.');
        }
    }
}

// initializes the map location in Mundelein; creates the map; defines initial hardcoded locations
function initialize() {
    //https://developers.google.com/maps/documentation/javascript/reference#MapOptions)
    var mapOptions = {
        center: { lat: 42.262907, lng: -87.998668},
        zoom: 14
    };

    // Create the map in the map div
    var mapCanvas = document.getElementById('map');
    map = new google.maps.Map(mapCanvas, mapOptions);

    // Define an info window that will display the list of all the hardcoded locations to the left
    // https://developers.google.com/maps/documentation/javascript/infowindows
    infoWindow = new google.maps.InfoWindow();

    // All the locations that will be put in the map
    initialLocations  = [
    new Location('Culvers', 'Fast Food Restaurant, Burger Joint, and Ice Cream Shop', 42.2405478, -87.9903809, {'foursquareId': '4b6a178af964a520ffc62be3'})
     ,new Location('Bill\'s Pizza Pub', 'Pizza Place and Pub', 42.255294, -88.001702, {'foursquareId': '4b47923af964a520013626e3'})
     ,new Location('Pizza Hut', 'Family-friendly chain known for its made-to-order pizzas.', 42.253335, -87.999663, {'foursquareId': '4b563c7af964a520c30628e3'})
     ,new Location('Monica\'s Mexican Restaurant', 'Mexican Restaurant', 42.251313, -87.995717, {'foursquareId': '4bad5d88f964a520874a3be3'})
     ,new Location('Franks for the Memories', 'Hot Dog Joint', 42.270871, -87.994086, {'foursquareId': '4b5b5bebf964a52093f728e3'})
     ];

    // created a mapViewModel variable because it's needed outside the MapViewModel function
    // (used in openInfoWindow, selectMarker, 'domready' and 'closeclick' eventListeners)
    mapViewModel = new MapViewModel();
    // moved to the initialize() function from the end of the file
    ko.applyBindings(mapViewModel);}

// Define a structure to hold the hardcoded locations
var Location = function(title, description, latitude, longitude, thirdParty) {
    // Need an extra set of ko.observable variables for Location
    var self = this; // http://knockoutjs.com/documentation/computedObservables.html
    self.title = ko.observable(title); // hardcoded: Culvers - used in the Marker title
    self.description = ko.observable(description); // hardcoded: Fast Food Restaurant, Burger Joint, and Ice Cream Shop
    self.latitude = ko.observable(latitude); // used to create the Marker
    self.longitude = ko.observable(longitude); // used to create the Marker
    self.foursquareId = ko.observable(thirdParty.foursquareId); // used by the foursquare API

    //Define the marker and make it animate
    //google.maps.Marker (https://developers.google.com/maps/documentation/javascript/reference#Marker)
    self.marker = new google.maps.Marker({
        position: new google.maps.LatLng(self.latitude(), self.longitude()),
        map: map,
        animation: google.maps.Animation.DROP, //https://developers.google.com/maps/documentation/javascript/examples/marker-animations
        title: self.title()
    });

    // Listener for when a marker is clicked; Open the infoWindow to display information hardcoded and from foursquare
    google.maps.event.addListener(self.marker,'click', function() {
        parent.mapViewModel.openInfoWindow(self);
    });
};

//viewmodel for Knockout
var MapViewModel = function() {
    var self = this; //http://knockoutjs.com/documentation/computedObservables.html

    //grab the input of the user from the search textbox
    self.query = ko.observable('');

    //grab all the hardcoded initialLocations - to use in the getLocation() function below
    self.locations = ko.observableArray(initialLocations);

    //grab the titles of all the locations
    self.currentLocation = ko.observable(self.locations()[0]);

    //define a filter variable that will hold only the filtered locations
    self.filter = ko.observable('');

    //Called by openInfoWindow -> changes the current location to the new location that was selected
    self.setCurrentLocation = function(obj) {
        // if the new location title is one of the ones from my hardcoded list
        if (obj = self.getLocation(obj.title())) {

            //if the selected location is different, stop the animation of the old marker location
            obj != self.currentLocation()? self.currentLocation().marker.setAnimation(null) : self.currentLocation();

            //make the new selected location marker animate
            obj.marker.setAnimation(google.maps.Animation.BOUNCE);

            //smoothly pan to the next location
            //http://stackoverflow.com/questions/2108346/how-can-i-have-a-smooth-animated-move-between-2-google-maps-locations
            map.panTo(obj.marker.getPosition());

            return self.currentLocation(obj);
        }
    };

    //Given a title, what is its location?
    self.getLocation = function(title) {
        for (var loc in self.locations()) {
            //make sure it is in the hardcoded locations
            if (self.locations()[loc].title() === title) {
                return self.locations()[loc];
            }
        }
    };

    //A new location was selected. Open the info window with the hardcoded information, and information from foursquare
    self.openInfoWindow = function(location) {
    	var innerHtml;
        self.setCurrentLocation(location);

        //Make sure we have a foursquareId
	 	if (location.foursquareId()) {
	 		//Foursquare URL
            var url = 'https://api.foursquare.com/v2/venues/explore?near=Mundelein&venuePhotos=1&query=' + location.title() + '&intent=match&client_id=3PGWKY25A5ELKUFPXS4TTDJD2Z4KORTFG3SPR4YG5NQGNYHA&client_secret=PM5TMG04PACEUYTYP044PNUSCHFPFM4SW44IDMEGRHU5DMGK&v=20151211';
            getJSON(url, setFoursquarePhoto, onErrorCallback);
        } else {
        	console.log("foursquareId not found in the location parameter");
            onErrorCallback();
        }

		//Call the Foursquare API to load a photo from the place
		function getJSON(url, onSuccessCallback, onErrorCallback) {
		    var request = new XMLHttpRequest();
		    request.open('GET', url, true);
		    var delay=1000; //1 second
			setTimeout(function() {}, delay);
		    request.onload = function() {
		        if (request.status >= 200 && request.status < 400) {
		            var data = JSON.parse(request.responseText);
		            onSuccessCallback(data);
		        } else {
		            onErrorCallback(request.status);
		        }
		    };
		    request.onerror = onErrorCallback;
		    request.send();
		}

        function setFoursquarePhoto(data) {
            var queryResults = data.response.groups[0].items;
            if (queryResults) {
                //Using the location ID, grab the first photo
                for (var i = 0, length = queryResults.length; i < length; i++) {
                    if (queryResults[i].venue.id === location.foursquareId()) {
                        return setPhotoFromVenueInfo(queryResults[i]);
                    }
                }
            } else {
                onErrorCallback();
            }
        }

        function setPhotoFromVenueInfo(data) {
            try {
                var venuePhoto = data.venue.photos.groups[0].items[0],
                photoId = venuePhoto.id,
                prefix = venuePhoto.prefix,
                suffix = venuePhoto.suffix,
                size = "200x200",
                src = prefix + size + suffix,
                sourceUrl = 'https://foursquare.com/v/' + location.foursquareId() + '?openPhotoId=' + photoId;
                innerHtml = '<a target="_blank" href="' + sourceUrl + '"><img class="source" alt="" src="' + src +'"></a>';
                var sourceHtml = '<br><a target="_blank" class="source icon-foursquare" href="' + sourceUrl + '"> See more on Foursquare</a>';

        		if(typeof innerHtml === "undefined")
		        	var content = '<div><strong>' + location.title() + '</strong><br />' + location.description() + '</div>';
		    	else
		    	 	var content = '<div><strong>' + location.title() + '</strong><br />' + location.description() + '</div>' + innerHtml;

		        infoWindow.setContent(content);
            } catch (e) {
                onErrorCallback();
            }
        }

         function onErrorCallback() {
         	console.log("error with photo");
        }

		infoWindow.open(map, location.marker);
    };

    //Filter function: From index.html; uses valueMatches() function at the end of the file
    self.filterLocations = ko.computed(function() {
        return ko.utils.arrayFilter(self.locations(), function (location) {
            if (valueMatches(self.query(), location.title()) && (!self.filter())) {
                location.marker.setMap(map);
                return true;
            } else {
                location.marker.setMap(null);
                return false;
            }
        });
    });

    //From index.html -> When the search button is clicked, the first location in my list that matches the query is selected
    self.selectMarker = function() {
        if (self.locations().length) {
            self.openInfoWindow(self.filterLocations()[0]);
            self.query(''); //set the input from the user to empty
        }
    };

    //Listen to the domready event, which is fired when the containing the infoWindow is is attached to the DOM.
    //http://stackoverflow.com/questions/5416160/listening-for-the-domready-event-for-google-maps-infowindow-class
    google.maps.event.addListener(parent.infoWindow, 'domready', function(e) {
        //What marker location was clicked?
        var location = self.getLocation(parent.infoWindow.getAnchor().title);
        //If location is not populated, don't set the current location; otherwise set it as the current location
        if (location) {
            self.setCurrentLocation(location);
        }
    });

    //Listend to the closeclick event, which is fired when the infoWindow is closed.
    google.maps.event.addListener(parent.infoWindow, 'closeclick', function(e) {
        //Stop the current marker's animation
        self.currentLocation().marker.setAnimation(null);
    });
};

//Load the map by sending an asynchronous cross-domain request that returns a JSON
function getJSONP(url, onSuccessCallback, onErrorCallback) {
    var script = document.createElement('script'),
        callbackName = 'jsonp_callback_';
    window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        onSuccessCallback(data);
    };
    script.src = url + (url.indexOf('?') + 1 ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = onErrorCallback;
    document.body.appendChild(script);
};

// Function used in the filter to check if inputString is contained in testString
function valueMatches(inputString, testString) {
    var CASE_INSENSITIVE_MATCHING = 'i';
    return RegExp(regExpEscape(inputString.trim()), CASE_INSENSITIVE_MATCHING).test(testString);
};

// Escape the given string to be treated as a literal string
// source - https://github.com/LeaVerou/awesomplete/blob/52402fae2394873e7bb01e082f2d69c8439d7a0e/awesomplete.js
function regExpEscape(s) {
    return s.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
};