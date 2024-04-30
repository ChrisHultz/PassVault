window.addEventListener('DOMContentLoaded', (event) => {
    function clearQueryParams() {
        history.replaceState({}, document.title, window.location.pathname);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        const errorMessageElement = document.getElementById('errorMessage');
        errorMessageElement.textContent = decodeURIComponent(error);
        errorMessageElement.style.display = 'block';
        clearQueryParams();
    }
});