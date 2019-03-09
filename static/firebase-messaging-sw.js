// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If you do not serve/host your project using Firebase Hosting see https://firebase.google.com/docs/web/setup
importScripts("https://www.gstatic.com/firebasejs/5.5.8/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/5.5.8/firebase-messaging.js");

  // [START get_messaging_object]
  // Retrieve Firebase Messaging object.
  var config = {
		    apiKey: "AIzaSyDj4CEPhB9Z3t5cvN7IQwbWfAO7Ni4UU_Q",
		    authDomain: "pushnotification-aeda5.firebaseapp.com",
		    databaseURL: "https://pushnotification-aeda5.firebaseio.com",
		    projectId: "pushnotification-aeda5",
		    storageBucket: "pushnotification-aeda5.appspot.com",
		    messagingSenderId: "294015857205"
		  };
	firebase.initializeApp(config);
  const messaging = firebase.messaging();
  // [END get_messaging_object]
  // [START set_public_vapid_key]
  // Add the public key generated from the console here.
  //messaging.usePublicVapidKey('BECfHpv-5w1GBKbz7-zFn3oqX9pSulGSzjXcBpgKwRu9MME80sQu_r5e1JOzGMxT_TxfQgBXWVZdOEme7U7BnAc');

/**
 * Here is is the code snippet to initialize Firebase Messaging in the Service
 * Worker when your app is not hosted on Firebase Hosting.

 // [START initialize_firebase_in_sw]
 // Give the service worker access to Firebase Messaging.
 // Note that you can only use Firebase Messaging here, other Firebase libraries
 // are not available in the service worker.
 importScripts('https://www.gstatic.com/firebasejs/4.8.1/firebase-app.js');
 importScripts('https://www.gstatic.com/firebasejs/4.8.1/firebase-messaging.js');

 // Initialize the Firebase app in the service worker by passing in the
 // messagingSenderId.
 firebase.initializeApp({
   'messagingSenderId': 'YOUR-SENDER-ID'
 });

 // Retrieve an instance of Firebase Messaging so that it can handle background
 // messages.
 const messaging = firebase.messaging();
 // [END initialize_firebase_in_sw]
 **/


// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// [START background_handler]
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  var notificationTitle = 'Background Message Title';
  var notificationOptions = {
    body: 'Background Message body.',
    icon: '/firebase-logo.png'
  };

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});
// [END background_handler]
