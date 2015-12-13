// personal Assist app module
var personalAssist = angular.module('personalAssist', ['locator']);

function mainController($scope, $http,location) {
    location.get(angular.noop, angular.noop);
    $scope.formData = {};
    $scope.formUser = {};
    
    $scope.formUser = {};
    $scope.loggedIn = false;
    $scope.loggedInUser;  
  
    $scope.validateEmail = function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    $scope.verifyPassword = function (str) {
    // at least one number, one lowercase and one uppercase letter
    // at least six characters
        var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
        return re.test(str);
    }

    $scope.verifyCredentials = function(){
        // if email is entered
        if(!$scope.formUser.hasOwnProperty('email')){
            alert("Please enter email address");
            return false;
        }
        // if password is entered
        if(!$scope.formUser.hasOwnProperty('password')){
             alert("Please enter password");
             return false;
        }
        // if email is valid
        if(!$scope.validateEmail($scope.formUser.email)){
            alert("Please enter valid email address");
            return false;
        }
        // if password is valid
        if(!$scope.verifyPassword($scope.formUser.password)){
            alert("Please enter a password at least one number, one lowercase and one uppercase letter at least six characters");
            return false;
        }

        return true;
    }

    // user login flow
    // register new user
    $scope.registerUser = function() {
        if($scope.verifyCredentials())  {
            $http.post('/register', $scope.formUser)
            .success(function(data) {
            $scope.loggedInUser = data;             
            $scope.loggedIn = true;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
        }
    }

    // user login flow
    // login user 
    $scope.loginUser = function() {
        
        if($scope.verifyCredentials())  {
            $http.post('/signin', $scope.formUser)
                .success(function(data) {
                    $scope.loggedInUser = data;
                    $scope.loggedIn = true;
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                    alert(data);
            });
        }
    }    

    // create task for user
    $scope.createTask = function() {
       $scope.formData.dueDate = $("#datetimepicker").val();
       // validate all inputs
       if(!$scope.formData.hasOwnProperty('pickedLocation') && !$scope.formData.hasOwnProperty('lookedUpLocation')){
            alert("Please pick a location or search for it");
            return false;
       }
       if(!$scope.formData.hasOwnProperty('task')){
            alert("Please enter a task");
            return false;
       }
       if($scope.formData.dueDate==""){
            alert("Please select time");
            return false;
       }

       if($scope.formData.hasOwnProperty('lookedUpLocation')){
            $scope.formData.location = $scope.formData.lookedUpLocation;
            delete $scope.formData.lookedUpLocation;

       }
       else{
            $scope.formData.location = $scope.formData.pickedLocation;
            delete $scope.formData.pickedLocation;
       }
      
        $scope.formData.userId = $scope.loggedInUser ;

        // send request to add task for user
       $http.post('/api/todos', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $("#datetimepicker").val("");
                $scope.todos = data;
                console.log(data);
                alert("Task added succesfully");
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
        console.log($scope.formData);
    };
}