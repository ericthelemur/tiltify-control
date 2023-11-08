// Set toggle button on load
document.getElementById('dark-mode').addEventListener('click', () => {
    const curr_light = localStorage.getItem("dark_mode") == "light";
    localStorage.setItem("dark_mode", !curr_light ? "light" : "dark");
    dark();
});
