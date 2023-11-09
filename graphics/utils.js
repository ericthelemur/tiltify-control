// Helper function to create nested div structure
// Many JS frameworks have similar, but keeping no dependencies
function createElem(tag, classes = [], content = undefined, post_hook = undefined, children = []) {
    const elem = document.createElement(tag);
    for (const c of classes) {
        elem.classList.add(c);
    }
    if (content) elem.innerText = content;
    for (const ch of children) {
        elem.appendChild(ch);
    }
    if (post_hook) post_hook(elem);
    return elem;
}

function createIcon(icon, label = undefined) {
    // Create a Bootstrap icon with optional text
    const i = [createElem("i", ["bi", "bi-" + icon])];
    if (label) i.push(createElem("span", [], " " + label))
    return i;
}