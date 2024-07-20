$(document).ready(function () {
  $("#toggle-switch").change(function () {
    if ($(this).is(":checked")) {
      $("#login-form").addClass("hidden");
      $("#signup-form").removeClass("hidden");
      $("#toggle-text").text("Login");
    } else {
      $("#signup-form").addClass("hidden");
      $("#login-form").removeClass("hidden");
      $("#toggle-text").text("Sign Up");
    }
  });

  $("#login-form").submit(function (event) {
    event.preventDefault();
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    
    $.ajax({
      url: "http://localhost:3000/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username, password }),
      success: function (response) {
        console.log('Login response:', response);
        if (response.isAdmin) {
          console.log('Admin login detected, clearing local storage.');
          localStorage.clear(); // Clear local storage on admin login
          sessionStorage.setItem('isAdmin', true);
          localStorage.setItem('username','Admin');
        } else {
          console.log("Storing license plate in local storage:", response.licensePlate);
          localStorage.setItem('licensePlate', response.licensePlate); // Store the license plate
          localStorage.setItem('username', response.username); // Store the username
          localStorage.setItem('wallet',response.wallet);
          console.log(response.username);
          sessionStorage.setItem('isAdmin', false);
          
        }
        window.location.href = "parking.html";
      },
      error: function (xhr, status, error) {
        console.error("Error logging in:", error);
        alert("Invalid username or password");
      }
    });
});


  $("#signup-form").submit(function (event) {
    event.preventDefault();
    const username = $("#signup-username").val();
    const password = $("#signup-password").val();
    const reenterPassword = $("#signup-reenter-password").val();
    const licensePlate = $("#signup-license-plate").val();
    const mobile = $("#signup-mobile").val();

    if (password !== reenterPassword) {
      alert("Passwords do not match");
      return;
    }

    $.ajax({
      url: "http://localhost:3000/signup",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username, password, licensePlate, mobile }),
      success: function (response) {
        alert("Sign up successful, please log in.");
        $("#toggle-switch").prop("checked", false).change();
      },
      error: function (err) {
        alert("Sign up failed: " + err.responseJSON.error);
      },
    });
  });
});
