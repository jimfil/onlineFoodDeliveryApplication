document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const businessName = document.getElementById('businessName').value;
            const firstNameOwner = document.getElementById('firstNameOwner').value;
            const lastNameOwner = document.getElementById('lastNameOwner').value;
            const afm = document.getElementById('afm').value;
            const email = document.getElementById('emailOwner').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const phone = document.getElementById('phone').value;

            if (password !== confirmPassword) {
                alert('Οι κωδικοί δεν ταιριάζουν!');
                return;
            }

            const userData = {
                businessName,
                firstNameOwner,
                lastNameOwner,
                afm,
                email,
                password,
                phone
            };

            try {
                const response = await fetch('/api/auth/register-restaurant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Η εγγραφή ολοκληρώθηκε επιτυχώς!');
                    // Save token and user info
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirect to management page
                    window.location.href = 'manage-restaurant.html';
                } else {
                    alert('Σφάλμα: ' + (data.error || 'Κάτι πήγε στραβά'));
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Αποτυχία σύνδεσης με τον διακομιστή.');
            }
        });
    }
});
