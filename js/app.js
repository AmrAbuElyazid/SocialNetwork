var access = angular.module('myApp', ['ngRoute', 'firebase', 'relativeDate']);

access.run(function ($firebaseAuth, $rootScope) {
    var authObj = $firebaseAuth();
    authObj.$onAuthStateChanged(function(firebaseUser) {
      if (firebaseUser) {
        console.log("Signed in as:", firebaseUser);
        $rootScope.currentUser = firebaseUser;
        if(window.location.hash == '#/login' || window.location.hash == '#/signup') {
            window.location = '/#/dashboard';
        }
      } else {
        console.log("Signed out");
        window.location = '#/login';
      }
    });
})
access.factory('auth', function ($firebaseAuth) {
    var authObj = $firebaseAuth();
    var firebaseUser = authObj.$getAuth();

    if (firebaseUser) {
        return firebaseUser;
    } else {
        return false;
    }
})
access.controller('dashboard', function ($scope, $firebaseArray, $rootScope, $firebaseAuth, $firebaseObject) {

    $scope.loading = true;

    var ref = firebase.database().ref('Posts');
    $scope.posts = $firebaseArray(ref);
    $scope.posts.$loaded().then(function () {
        $scope.loading = false;
    })

    $scope.getFriends = function () {
        var r = firebase.database().ref('friendships');
        var friendships = $firebaseArray(r);
        var friendsIDs = [];
        friendships.$loaded(function () {
            for (var i = friendships.length - 1; i >= 0; i--) {
                if(friendships[i].includes($rootScope.currentUser.uid)) {
                    friendsIDs.push(friendships[i][0] == $rootScope.currentUser.uid ? friendships[i][1] : friendships[i][0]);
                }
            }
            console.log(friendsIDs)
            for (var i = friendsIDs.length - 1; i >= 0; i--) {
                var rr = firebase.database().ref('users').child(friendsIDs[i]);
                var friend = $firebaseObject(rr);
                friend.$loaded().then(function (res) {
                    console.log(friend[Object.keys(friend)[3]])
                })
            }
        })
    }
    $scope.getFriends();

	$scope.newPost = function () {
        $scope.loading = true;
		if ($rootScope.currentUser) {
            $scope.posts.$add({
                post: $scope.post,
                uid: $rootScope.currentUser.uid,
                username: $rootScope.currentUser.displayName,
                created_at: firebase.database.ServerValue.TIMESTAMP
            }).then(function (res) {
                console.log(res)
                $scope.post = '';
                $scope.loading = false;
            }, function (err) {
                console.log(err)
            })
        }
	}
});


access.controller('signupCtrl', function ($scope, $firebaseAuth, $firebaseArray) {
    $scope.signup = function () {
        $scope.authObj = $firebaseAuth();
        if($scope.email && $scope.password && $scope.username) {
            $scope.authObj.$createUserWithEmailAndPassword($scope.email, $scope.password)
              .then(function(firebaseUser) {
                firebaseUser.updateProfile({
                    displayName: $scope.username
                })
                var ref = firebase.database().ref('users').child(firebaseUser.uid);
                var users = $firebaseArray(ref);
                users.$add({
                    email: firebaseUser.email,
                    name: $scope.username
                });
                console.log(users)
                console.log("User " + firebaseUser.displayName + " created successfully!");
              }).catch(function(error) {
                console.error("Error: ", error);
              });
        }
    }
})

access.controller('loginCtrl', function ($scope, $firebaseAuth) {
    $scope.login = function () {
        $scope.authObj = $firebaseAuth();
        $scope.authObj.$signInWithEmailAndPassword($scope.email, $scope.password).then(function(firebaseUser) {
          console.log("Signed in as:", firebaseUser.uid);
          window.location = '/#/dashboard';
        }).catch(function(error) {
          console.error("Authentication failed:", error);
        });
    }
})

access.controller('userCtrl', function ($routeParams, $scope, $firebaseArray, $rootScope) {
    $scope.user_id = $routeParams.ID;
    var ref = firebase.database().ref('users').child($routeParams.ID);
    $scope.user = $firebaseArray(ref);
    console.log($scope.user);
    $scope.loading = true;
    $scope.checkFriendshipsStatus = function () {
        $scope.user.$loaded().then(function () {
            if($scope.user_id != $scope.currentUser.uid) {
                var r = firebase.database().ref('friendships');
                $scope.friendships = $firebaseArray(r);
                $scope.friendships.$loaded().then(function () {
                    for (var i = $scope.friendships.length - 1; i >= 0; i--) {
                        if($scope.friendships[i].includes($scope.user_id) && $scope.friendships[i].includes($rootScope.currentUser.uid)) {
                            var check = true;
                            break;
                        }
                    }
                    if(check) {
                        $scope.isFriend = true;
                    }else{
                        $scope.isFriend = false;
                    }
                    $scope.loading = false;
                })
            }else{
                $scope.loading = false;
            }
        })
    }

    $scope.addFriend = function () {
        $scope.loading = true;
        $scope.friendships.$add([$scope.user_id, $rootScope.currentUser.uid]).then(function (res) {
            $scope.checkFriendshipsStatus();
        }, function (err) {
            console.log(err)
        })
    }

    $scope.unfriend = function () {
        $scope.loading = true;
        for (var i = $scope.friendships.length - 1; i >= 0; i--) {
            if($scope.friendships[i].includes($scope.user_id) && $scope.friendships[i].includes($rootScope.currentUser.uid)) {
                var index = i;
                break;
            }
        }
        $scope.friendships.$remove(index).then(function () {
            $scope.checkFriendshipsStatus();
        })
    }
})

access.config(function($routeProvider) {
    $routeProvider
    .when("/dashboard", {
        templateUrl : "dashboard.html",
        controller : "dashboard"
    })
    .when("/signup", {
        templateUrl : "signup.html",
        controller : "signupCtrl"
    })
    .when("/login", {
        templateUrl : "login.html",
        controller : "loginCtrl"
    })
    .when("/user/:ID", {
        templateUrl: "user.html",
        controller: 'userCtrl'
    })
    .otherwise({
        templateUrl : "login.html",
        controller : "loginCtrl"
    })
});
