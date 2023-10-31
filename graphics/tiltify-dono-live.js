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

// Replicants used
var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");
var approvedDonationsRep = nodecg.Replicant("approvedDonations");

// Display formats
const displayCurrFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });
const baseCurrFormat = (curr) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

function getAmount(currency, value, disp) {
    // Format value for display
    const c1 = baseCurrFormat(currency).format(value);
    if (currency == nodecg.bundleConfig.displayCurrency || disp === undefined) {
        return [c1, undefined]
    }
    return [c1, displayCurrFormat.format(disp)]
}

// Settings elements
const donoElem = document.getElementById("donations");
const clearDonosElem = document.getElementById("clear-donations");
const showReadElem = document.getElementById("show-read");
const showCensoredElem = document.getElementById("show-censored");
const newestFirstElem = document.getElementById("newest");
const approveAllElem = document.getElementById("approve-all");

function createIcon(icon, label = undefined) {
    // Create a Bootstrap icon with optional text
    const i = [createElem("i", ["bi", "bi-" + icon])];
    if (label) i.push(createElem("span", [], " " + label))
    return i;
}

function createButton(toggle, textTrue, iconTrue, textFalse, iconFalse, onclick = undefined, classes = []) {
    // Create toggle button with icon & text
    const button = createElem("button", ["btn", toggle ? "btn-primary" : "btn-outline-primary"], undefined, undefined,
        createIcon(toggle ? iconTrue : iconFalse, toggle ? textTrue : textFalse)
    );
    if (onclick) button.addEventListener("click", onclick);
    classes.forEach((c) => button.classList.add(c));
    return button;
}

function moveKey(dono) {
    // Generates the key to identify donations with
    return { id: dono.id, read: dono.read, modStatus: dono.modStatus }
}

var existing = [];
var readMsg = [];
function updateDonoList(newvalue = undefined) {
    // This can be triggered with on change or generally
    if (newvalue === undefined) newvalue = donationRep.value;
    console.log("Updating", newvalue)

    var newexisting = [];
    var newdonos = [];
    var i = 0;
    if (newestFirstElem.checked) newvalue = newvalue.slice().reverse();
    if (newvalue.length == 0) newdonos = [createElem("h2", undefined, "No donations yet")]
    for (var dono of newvalue) {
        if (dono.read && !showReadElem.checked) continue;
        if (dono.modStatus === CENSORED && !showCensoredElem.checked) continue;
        if (i >= 50) {
            newdonos.push(createElem("p", [], "Too many donations, truncating here"));
            break;
        }

        // Track if element has moved, if so, disable buttons below for 1s
        const key = moveKey(dono);
        const changed = JSON.stringify(key) !== JSON.stringify(existing[i]);
        newexisting.push(key);
        i++;

        const amount = getAmount(dono.amount.currency, dono.amount.value, dono.amountDisplay);
        const date = new Date(dono.completed_at);
        const cardClasses = ["card", dono.read ? "read" : "unread", tripleState(dono.modStatus, "approved", "undecided", "censored")];
        newdonos.push(createElem("div", cardClasses, undefined, (e) => e.id = "dono-" + dono.id, [
            createElem("div", ["card-body"], undefined, undefined, [
                // Title with donor and amounts
                createElem("h2", ["h5", "card-title"], undefined,
                    (e) => { if (dono.shown) e.prepend(createIcon("eye-fill")) },
                    [
                        createElem("span", ["name"], dono.donor_name),
                        createElem("span", ["donated"], " donated "),
                        createElem("span", ["amount"], amount[0]),
                        createElem("span", ["amount", "amount-gbp"], amount[1] ? ` (${amount[1]})` : ""),
                    ]),
                // Subtitle with date and status effects
                createElem("small", ["datetime", "card-subtitle", "text-black-50"], undefined, undefined, [
                    createElem("span", ["time"], timeFormat.format(date)),
                    createElem("span", [], " "),
                    createElem("span", ["date"], dateFormat.format(date)),
                    createElem("div", ["statuses", "d-inline-flex", "gap-2", "ms-2"], undefined, undefined, [
                        ...dono.read ? createIcon("envelope-open-fill") : createIcon("envelope-fill"),
                        ...dono.shown ? createIcon("eye-fill") : createIcon("eye-slash-fill"),
                        ...tripleState(dono.modStatus, createIcon("check-square"), createIcon("question-square"), createIcon("x-square"))
                    ])
                ]),
                createElem("p", ["message", "card-text"], dono.donor_comment || "No Message"),
                createButtons(dono, changed)
            ])
        ]));
    }

    donoElem.replaceChildren(...newdonos);
    existing = newexisting;
}

// Update dono list on donation coming in
donationRep.on("change", function (newvalue, oldvalue) {
    if (newvalue !== undefined && (oldvalue === undefined || JSON.stringify(newvalue) !== JSON.stringify(oldvalue))) {
        updateDonoList(newvalue);
    }
});

clearDonosElem.addEventListener("click", () => {
    var confirmClear = confirm("Are you sure you want to clear all donations for all readers?")
    if (confirmClear == true) {
        nodecg.sendMessageToBundle('clear-donations', 'nodecg-tiltify');
    }
})

approveAllElem.addEventListener("click", () => {
    var confirmClear = confirm("Are you sure you want to mark all unmoderated donations approved?")
    if (confirmClear == true) {
        for (const dono of donationRep.value) {
            if (dono.modStatus === UNDECIDED) {
                dono.modStatus = APPROVED;
            }
        }
    }
})

showReadElem.addEventListener("input", (e) => {
    updateDonoList();
})

showCensoredElem.addEventListener("input", (e) => {
    updateDonoList();
})

newestFirstElem.addEventListener("input", (e) => {
    updateDonoList();
})
