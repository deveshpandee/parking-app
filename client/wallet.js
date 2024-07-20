document.addEventListener('DOMContentLoaded', function () {
  // Fetch username from localStorage
  const username = localStorage.getItem('username');
  const wallet = localStorage.getItem('wallet');
  // Update username in UI
  if (username) {
    document.getElementById("username").textContent = username;
  }
  if(wallet)
    {
      document.getElementById("balance").textContent = wallet;
    }

  // Add event listener to the Add Money button
  const addMoneyButton = document.getElementById('add-money-button');
  if (addMoneyButton) {
    addMoneyButton.addEventListener('click', handleAddMoney);
  } else {
    console.error('Add Money button not found.');
  }
});

async function handleAddMoney(event) {

  console.log('Add Money button clicked.');

  const amountToAdd = document.getElementById('amountToAdd').value.trim();
  console.log('Retrieved amount:', amountToAdd);

  if (!amountToAdd || isNaN(amountToAdd) || amountToAdd <= 0) {
    alert('Please enter a valid amount to add.');
    return;
  }

  try {
    // Retrieve username with error handling
    const username = await localStorage.getItem('username');
    if (!username) {
      console.error('Username not found in local storage');
      alert('An error occurred. Please try again.');
      return;
    }

    const currentBalance = parseInt(localStorage.getItem('wallet')) || 0;
    const newBalance = currentBalance + parseInt(amountToAdd);

    const response = await fetch('http://localhost:3000/api/updateWallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include', // Send cookies and session data
      body: JSON.stringify({ username, balance: amountToAdd })
    });

    console.log('Request body:', { username, balance: amountToAdd }); // Added log for debugging

    if (!response.ok) {
      console.error('Network response was not ok', response.statusText);
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log('Response received:', data);

    // Update balance in UI and local storage (optional) after successful update
    document.getElementById('balance').textContent = `Rs. ${newBalance}`;
    localStorage.setItem('wallet', newBalance);

    alert('Wallet updated successfully.');
  } catch (error) {
    console.error('Error updating wallet:', error);
    alert('Failed to update wallet. Please try again.');
  }
}
