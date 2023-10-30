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

// Display formats
const displayCurrFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });
const baseCurrFormat = (curr) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

// Format value for display
function getAmount(currency, value, disp) {
    const c1 = baseCurrFormat(currency).format(value);
    if (currency == nodecg.bundleConfig.displayCurrency || disp === undefined) {
        return [c1, undefined]
    }
    return [c1, displayCurrFormat.format(disp)]
}

function read(dono) {
    if (!dono.read) {
        return () => nodecg.sendMessageToBundle('mark-donation-as-read', 'nodecg-tiltify', dono);
    } else {
        return () => dono.read = false;
    }
}

function approve(dono) {
    return () => dono.approved = !dono.approved;
}

const donoElem = document.getElementById("donations");
const clearDonosElem = document.getElementById("clear-donations");
const showReadElem = document.getElementById("show-read");
const newestFirstElem = document.getElementById("newest");

function moveKey(dono) {
    return { id: dono.id, read: dono.read }
}

function createIcon(icon) {
    return createElem("i", ["bi", "bi-" + icon]);
}

function createButton(toggle, textTrue, iconTrue, textFalse, iconFalse, onclick = undefined) {
    const button = createElem("button", ["btn", toggle ? "btn-primary" : "btn-outline-primary"], undefined, undefined, [
        createIcon(toggle ? iconTrue : iconFalse),
        createElem("span", undefined, toggle ? textTrue : textFalse)
    ]);
    if (onclick) button.addEventListener("click", onclick);
    return button;
}

var existing = [];
var readMsg = [];
var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");
function updateDonoList(newvalue = undefined) {
    // This can be triggered with on change or generally
    if (newvalue === undefined) newvalue = donationRep.value;
    console.log("Updating", newvalue)

    var newexisting = [];
    var newdonos = [];
    var i = 0;
    if (newestFirstElem.checked) newvalue = newvalue.slice().reverse();
    for (var dono of newvalue) {
        if (dono.read && !showReadElem.checked) continue;
        if (i >= 50) {
            newdonos.push(createElem("p", [], "Too many donations, truncating here"));
            break;
        }

        // Track if element has moved, if so, disable buttons below for 1s
        const key = moveKey(dono);
        console.log(key, existing[i])
        const changed = JSON.stringify(key) !== JSON.stringify(existing[i]);
        newexisting.push(key);
        i++;

        const btnGroup = createElem("div", ["btn-group"], undefined, (e) => e.role = "group", [
            createButton(!dono.read, "Read", "envelope-open-fill", "Unread", "envelope-fill", read(dono)),
            createButton(!dono.approved, "Approve", "eye-fill", "Censor", "eye-slash-fill", approve(dono))
        ])
        if (changed) {
            [].forEach.call(btnGroup.children, (e) => e.disabled = true);
            setTimeout(() => [].forEach.call(btnGroup.children, (e) => e.disabled = false), 500);
        }


        const amount = getAmount(dono.amount.currency, dono.amount.value, dono.amountDisplay);
        const date = new Date(dono.completed_at);
        const cardClasses = ["card"];
        if (dono.read) cardClasses.push("read");
        newdonos.push(createElem("div", cardClasses, undefined, (e) => e.id = "dono-" + dono.id, [
            createElem("div", ["card-body"], undefined, undefined, [
                createElem("h2", ["h5", "card-title"], undefined,
                    (e) => { if (dono.seen) e.prepend(createIcon("eye-fill")) },
                    [
                        createElem("span", ["name"], dono.donor_name),
                        createElem("span", ["donated"], " donated "),
                        createElem("span", ["amount"], amount[0]),
                        createElem("span", ["amount", "amount-gbp"], amount[1] ? ` (${amount[1]})` : ""),
                    ]),
                createElem("small", ["datetime", "card-subtitle", "text-black-50"], undefined, undefined, [
                    createElem("span", ["time"], timeFormat.format(date)),
                    createElem("span", [], " "),
                    createElem("span", ["date"], dateFormat.format(date))
                ]),
                createElem("p", ["message", "card-text"], dono.donor_comment || "No Message"),
                btnGroup
            ])
        ]));
    }

    donoElem.replaceChildren(...newdonos);
    existing = newexisting;
}

// Update dono list on donation coming in
donationRep.on("change", function (newvalue, oldvalue) {
    updateDonoList(newvalue);
});

clearDonosElem.addEventListener("click", () => {
    var confirmClear = confirm("Are you sure you want to clear all donations for all readers?")
    if (confirmClear == true) {
        nodecg.sendMessageToBundle('clear-donations', 'nodecg-tiltify');
    }
})

showReadElem.addEventListener("input", (e) => {
    updateDonoList();
})

newestFirstElem.addEventListener("input", (e) => {
    updateDonoList();
})