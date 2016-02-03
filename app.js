//global variables
var request = {
	location: {lat:42.262907,lng:-87.998668}, // Mundelein, IL
		//new google.maps.LatLng(42.262907, -87.998668);//another way to do it
	radius: '500',
	query: 'fast food'
},
	map,
	infoWindow, //information about the locations
	marker,markerArray = [], // display the points on the map
	clickedVenue = {},
	fsClientID = '3PGWKY25A5ELKUFPXS4TTDJD2Z4KORTFG3SPR4YG5NQGNYHA', //foursquare
	fsClientSecret = 'PM5TMG04PACEUYTYP044PNUSCHFPFM4SW44IDMEGRHU5DMGK', //foursquare
	fsURI = '', //foursquare
	venueAddress,
	venueURL;

//viewmodel for Knockout
var MapViewModel = function() {
	var self = this; // http://knockoutjs.com/documentation/computedObservables.html

	//https://developers.google.com/maps/documentation/javascript/places
	self.createMap = function(){
		map = new google.maps.Map(document.getElementById('map'),
			{
			center: request.location, //center on Mundelein, IL
			zoom: 12
		});
		self.runGoogleQuery(map);
	},

	//PlacesServiceStatus is a Google API function
	//runGoogleQuery calls PlacesServiceStatus.textSearch() with request.query, request.radius as params
	self.runGoogleQuery = function(map){
		var service = new google.maps.places.PlacesService(map);
		service.textSearch(request,self.callback);
	},

	self.callback = function(resultsFromQuery,status){
		if (status === google.maps.places.PlacesServiceStatus.OK){
			for (var i = 0,len = resultsFromQuery.length; i < len; i++){
				self.pushToLocationsArray(resultsFromQuery[i]);
				self.createMarker(resultsFromQuery[i]);
			}
		}
	},

	//http://knockoutjs.com/documentation/observableArrays.html
	//push to the Knockout locationsArray (observable array) all the results from PlacesServiceStatus.textSearch()
	self.pushToLocationsArray = function(place){
		self.locationsArray.push(place.name);
	},

	//Creates the markers - https://developers.google.com/maps/documentation/javascript/examples/marker-simple
	//Allows search - https://developers.google.com/maps/documentation/javascript/examples/place-search
	//Creates the infoWindow when a marker is clicked
	//???? Enables list view of the places returned by PlacesServiceStatus.textSearch() ??? where???
	self.createMarker = function(place){
		var placeLoc = place.geometry.location;
		infoWindow = new google.maps.InfoWindow();
		marker = new google.maps.Marker({
			map : map,
			position : placeLoc,
			animation: google.maps.Animation.DROP //https://developers.google.com/maps/documentation/javascript/examples/marker-animations
		});

		markerArray.push(marker);

		//Using addListener to detect clicks - https://developers.google.com/maps/documentation/javascript/events
		google.maps.event.addListener(marker,'click',function(){
			infoWindow.setContent(place.name + "<div id='container'></div>"); //creates 'container'
			infoWindow.open(map,this);
			self.doAjaxCall(place);
		});
	};//end createMarker

	//ajax
	self.doAjaxCall = function(place){
		var $fsContent = $('#container'); //retrieves the 'container' placed above

		//FourSquare Search API uses following URI structure
    	fsURI = 'https://api.foursquare.com/v2/venues/search?client_id='+ fsClientID +
    	'&client_secret=' + fsClientSecret + '&v=20151211&ll=' + request.location.lat
    	+ ',' + request.location.lng +
    	'&query=' + place.name + '&limit=1';

    	//retrieve the information from foursquare
		$.getJSON(fsURI,function(data){
				venuesDetails = data.response.venues[0];
				if(venuesDetails.location.address !== null && venuesDetails.location.address !== undefined) {
					venueAddress = venuesDetails.location.address;
					$fsContent.append('<p>'+ venueAddress +'</p>');
				}

            	if(venuesDetails.url !== null && venuesDetails.url !== undefined) {
            		venueURL = venuesDetails.url;
            		$fsContent.append('<a href="' + venueURL +'">' + venueURL + '</a>');
            	}

			}).error(function(e){
				$fsContent.text('Unexpected error while retrieving FourSquare data');
				return false;
			});
		},

	// doSearch is called from index.html
	// start the observable properties for data-binding, the search function and event handlers for mouseover	and mouseout events
	self.searchTxt = ko.observable(),
	self.locationsArray = ko.observableArray([]),
	self.doSearch = function(formElement){
		request.query = self.searchTxt();
		self.locationsArray([]);
		markerArray = [];
		self.createMap();
	},

	// enables animation of marker when a user moves mouse over a list item
	self.overVenueItem = function(index){
		clickedVenue = markerArray[index];
		if (clickedVenue.getAnimation() !== null) {
				clickedVenue.setAnimation(null);
		} else {
			clickedVenue.setAnimation(google.maps.Animation.BOUNCE);
		}
	},

	// enables animation of marker when a user moves mouse out of a list item
	self.outVenueItem = function(index){
		clickedVenue.setAnimation(null);
		clickedVenue = {};
	};

	google.maps.event.addDomListener(window, 'load', self.createMap);

};

ko.applyBindings(new MapViewModel());