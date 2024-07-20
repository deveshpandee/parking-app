//parking-details.js
$(document).ready(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const parkingId = sessionStorage.getItem("parkingId");
  const slot = sessionStorage.getItem("slots");
  const isAdmin = sessionStorage.getItem('isAdmin'); // Retrieve admin info from session storage
  const loggedInLicensePlate = localStorage.getItem('licensePlate'); // Get the stored license plate
  const username = localStorage.getItem('username');
  const user = document.getElementById("username");
  user.innerHTML = `${username}`;
  const balance = localStorage.getItem('wallet');
  const wallet_balance = document.getElementById("wallet-balance");
  wallet_balance.innerHTML = `Balance: ${balance}`;

  console.log("Retrieved license plate from local storage:", loggedInLicensePlate);
  
  console.log("Admin status:", isAdmin);

  // Hide the "Park Vehicle" button if the user is an admin
  if (isAdmin === "true") {
    $("#park-button").hide();
  }

  if (!parkingId) {
    console.error("No parking_id provided in URL");
    return;
  }
  const totalSlots = slot;
  let availableSlots = totalSlots;
  const tableName = `parking_lot_${parkingId}`;
  const heading = document.getElementById("heading");
  heading.innerHTML = `Parking Lot ${parkingId}`;

  function initializeSlots() {
    $.ajax({
      url: `http://localhost:3000/api/slots?tableName=${tableName}`,
      method: "GET",
      success: function (data) {
        availableSlots = totalSlots - data.length;
        $("#available-slots").text(`Available Slots: ${availableSlots}`);

        for (let i = 0; i < totalSlots; i++) {
          const slotBox = $(
            `<div class="parking-slot" data-slot-number="${i}" data-occupied="false"></div>`
          );
          slotBox.append(`<span>${i}</span>`);
          $("#parking-slots").append(slotBox);
        }

        data.forEach(function (slot) {
          const slotBox = $(
            `.parking-slot[data-slot-number="${slot.slotNumber}"]`
          );
          if (slot.licensePlate === loggedInLicensePlate) {
            slotBox.css("background-color", "orange");
            console.log("Matching slot for logged in user:", slot.licensePlate);
          } else {
            slotBox.css("background-color", "green");
          }
          slotBox.attr("data-occupied", "true");

          if (isAdmin === "true") {
            slotBox.find("span").text(slot.licensePlate);
          } else if (slot.licensePlate === loggedInLicensePlate) {
            slotBox.find("span").text(slot.licensePlate);
          } else {
            slotBox.find("span").text("Occupied");
          }
        });
      },
      error: function (err) {
        console.error("Error fetching slot data:", err);
      },
    });
  }

  initializeSlots();

  $("#park-button").click(function () {
    const licensePlate = loggedInLicensePlate; // Use the stored license plate directly
    let alreadyParked = false;

    $(".parking-slot").each(function () {
      if (
        $(this).attr("data-occupied") === "true" &&
        $(this).find("span").text() === licensePlate
      ) {
        alreadyParked = true;
        return false;
      }
    });

    if (licensePlate) {
      $.ajax({
        url: "http://localhost:3000/api/check-registration",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ licensePlate }),
        success: function (response) {
          if (response.registered) {
            if (!alreadyParked) {
              const balance = parseFloat(localStorage.getItem('wallet'));
              const fee = 50;
              if (balance < fee) {
                alert("Wallet balance is insufficient");
                return;
              }

              $.ajax({
                url: "http://localhost:3000/api/check-parked",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ tableName, licensePlate }),
                success: function (parkedResponse) {
                  if (!parkedResponse.parked) {
                    if (availableSlots > 0) {
                      let parked = false;
                      let parkedSlotNumber = null;
                      $(".parking-slot").each(function () {
                        if ($(this).attr("data-occupied") === "false") {
                          const slotNumber = $(this).attr("data-slot-number");
                          if (licensePlate === loggedInLicensePlate) {
                            $(this).css("background-color", "orange");
                          } else {
                            $(this).css("background-color", "green");
                          }
                          $(this).attr("data-occupied", "true");
                          if (isAdmin === "true" || licensePlate === loggedInLicensePlate) {
                            $(this).find("span").text(licensePlate);
                          } else {
                            $(this).find("span").text("Occupied");
                          }
                          availableSlots--;
                          $("#available-slots").text(`Available Slots: ${availableSlots}`);
                          parked = true;
                          parkedSlotNumber = slotNumber;

                          $.ajax({
                            url: "http://localhost:3000/api/park",
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({
                              tableName,
                              slotNumber,
                              licensePlate,
                              fee
                            }),
                            success: function (response) {
                              console.log("Vehicle parked successfully:", response);

                              // Update wallet balance
                              const newBalance = balance - fee;
                              localStorage.setItem('wallet', newBalance.toFixed(2));
                              $("#wallet-balance").text(`Balance: ${newBalance.toFixed(2)}`);
                            },
                            error: function (err) {
                              console.error("Error parking the vehicle:", err.responseJSON);
                            }
                          });

                          return false;
                        }
                      });

                      if (!parked) {
                        alert("Parking full! No slots available.");
                      }
                    } else {
                      alert("Parking full! No slots available.");
                    }
                  } else {
                    alert("This license plate is already parked.");
                  }
                },
                error: function (err) {
                  console.error("Error checking if license plate is parked:", err.responseJSON);
                }
              });
            } else {
              alert("This license plate is already parked.");
            }
          } else {
            alert("License plate is not registered with us");
          }
        },
        error: function (err) {
          console.error("Error checking registration:", err.responseJSON);
        },
      });
    } else {
      alert("Please enter a valid license plate number in the format AB12CD3456.");
    }
  });

  $("#parking-slots").on("click", ".parking-slot", function () {
    if ($(this).attr("data-occupied") === "true") {
      // Allow regular users to unpark their own vehicle
      const slotNumber = $(this).attr("data-slot-number");
      const slotLicensePlate = $(this).find("span").text();
      if (isAdmin !== "true" && slotLicensePlate === loggedInLicensePlate) {
        const confirmUnpark = confirm("Are you sure you want to unpark?");
        if (confirmUnpark) {
          availableSlots++;
          $("#available-slots").text(`Available Slots: ${availableSlots}`);
          $(this).css("background-color", "");
          $(this).attr("data-occupied", "false");
          $(this).find("span").text(slotNumber);

          $.ajax({
            url: "http://localhost:3000/api/unpark",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ tableName, slotNumber }),
            success: function (response) {
              console.log("Vehicle unparked successfully:", response);
            },
            error: function (err) {
              console.error("Error unparking the vehicle:", err.responseJSON);
            },
          });
        }
      } else {
        alert("You can only unpark your own vehicle.");
      }
    }
  });
});
