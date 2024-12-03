document.getElementById('navbar').innerHTML = `
  <div class="navbar">
    <a href="index.html" class="nav-link">Home</a>
    <div class="nav-right">
        <a href="s3upload.html" class="nav-link">Upload File</a>
        <a href="humanreview.html" class="nav-link">Human Review</a>
        <a href="csvdownload.html" class="nav-link">CSV Download</a>
        <div class="notification-dropdown">
            <a href="#" class="nav-link" id="notification-link">
                Notifications <span id="notification-count">(0)</span>
            </a>
            <div id="notification-list" class="dropdown-content">
                <!-- Notifications will be dynamically injected here -->
                <div id="notifications-container"></div>
                <div class="switch-container">
                    <label class="switch">
                        <input type="checkbox" id="notification-switch" checked>
                        <span class="slider"></span>
                    </label>
                    <span id="switch-label">ON</span>
                </div>
            </div>
        </div>
    </div>
  </div>
`;

const lambdaUrl = "https://bryz25g6wixeuoa6nch4cxepau0nmlyo.lambda-url.us-east-1.on.aws/";
let notifications = [];

function fetchNotifications() {
    fetch(lambdaUrl)
        .then(response => response.json())
        .then(data => {
            notifications = data;
            renderNotifications();
        })
        .catch(error => console.error('Error fetching notifications:', error));
}

function renderNotifications() {
    const notificationContainer = document.getElementById('notifications-container');
    const notificationSwitch = document.getElementById('notification-switch');
    const notificationList = document.getElementById('notification-list');

    if (!notificationSwitch.checked) {
        notificationContainer.innerHTML = ''; // Clear the notifications
        notificationList.style.display = 'none'; // Hide the notification dropdown content
    } else {
        notificationList.style.display = 'block'; // Show the dropdown content
        notificationContainer.innerHTML = ''; // Clear the container before rendering

        notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
            notificationItem.innerHTML = `
                <a href="#" onclick="markAsRead(${notification.id})">
                    ${notification.message}
                </a>
                <span class="delete-notification" onclick="deleteNotification(${notification.id})">x</span>
            `;
            notificationContainer.appendChild(notificationItem);
        });
    }

    updateNotificationCount();
}

function updateNotificationCount() {
    const unreadCount = notifications.filter(notification => !notification.read).length;
    const notificationCount = document.getElementById('notification-count');
    const notificationSwitch = document.getElementById('notification-switch');

    if (notificationSwitch.checked) {
        notificationCount.textContent = `(${unreadCount})`;
    } else {
        notificationCount.textContent = '(OFF)';
    }
}

function markAsRead(id) {
    const notification = notifications.find(notification => notification.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        updateNotificationStatus(id, true);
        renderNotifications();
    }
}

function deleteNotification(id) {
    notifications = notifications.filter(notification => notification.id !== id);
    updateNotificationStatus(id, false, true);
    renderNotifications();
}

function updateNotificationStatus(id, read, deleted = false) {
    fetch(lambdaUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, read, deleted })
    })
    .then(response => response.json())
    .then(data => console.log('Notification status updated:', data))
    .catch(error => console.error('Error updating notification status:', error));
}

// Event listener for the ON/OFF switch
document.getElementById('notification-switch').addEventListener('change', function() {
    const switchLabel = document.getElementById('switch-label');
    if (this.checked) {
        switchLabel.textContent = 'ON';
    } else {
        switchLabel.textContent = 'OFF';
    }
    renderNotifications(); // Re-render notifications based on switch state
});

// Event listener for the notification link click to turn ON notifications
document.getElementById('notification-link').addEventListener('click', function(event) {
    const notificationSwitch = document.getElementById('notification-switch');
    if (!notificationSwitch.checked) {
        event.preventDefault(); // Prevent the default behavior of clicking the link
        notificationSwitch.checked = true; // Turn the switch ON
        document.getElementById('switch-label').textContent = 'ON';
        renderNotifications(); // Re-render notifications
    }
});

fetchNotifications();

// Polling for new notifications every 30 seconds
setInterval(() => {
    if (document.getElementById('notification-switch').checked) {
        fetchNotifications();
    }
}, 30000);
