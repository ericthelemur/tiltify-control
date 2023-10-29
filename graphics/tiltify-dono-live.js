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

// Fetch conversion rates
var conversionRates = {};
fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.conversionRateKey}&base_currency=${nodecg.bundleConfig.displayCurrency}`)
    .then((r) => r.json())
    .then((j) => conversionRates = j.data)

// Display formats
const displayFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });
const baseFormat = (curr) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });

// Format value for display
function getAmount(currency, value) {
    const canConvert = conversionRates && currency in conversionRates;
    return [
        baseFormat(currency).format(value),
        canConvert ? displayFormat.format(value / conversionRates[currency]) : null
    ]
}

function read(dono) {
    if (!dono.read) {
        return () => {
            console.log("Reading", dono)
            nodecg.sendMessageToBundle('mark-donation-as-read', 'nodecg-tiltify', dono);
        }
    } else {
        return () => {
            console.log("Unreading", dono)
            dono.read = false;
        }
    }
}

const donoElem = document.getElementById("donations");
const clearDonosElem = document.getElementById("clear-donations");
const showReadElem = document.getElementById("show-read");

var existing = [];
var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");
function updateDonoList(newvalue = undefined) {
    // This can be triggered with on change or generally
    if (newvalue === undefined) newvalue = donationRep.value;
    console.log("Updating", newvalue)

    var newexisting = [];
    var changed = false;
    var newdonos = [];
    var i = 0;
    for (var dono of newvalue) {
        if (dono.read && !showReadElem.checked) continue;
        if (i >= 50) {
            newdonos.push(createElem("p", [], "Too many donations, truncating here"));
            break;
        }

        // Track if element has moved, if so, disable buttons below for 1s
        if (existing[i] != dono.id) {
            changed = true;
        }
        newexisting.push(dono.id);
        i++;

        const button = createElem("button", [], dono.read ? "Mark as unread" : "Mark as read");
        button.addEventListener("click", read(dono));
        if (changed) {
            button.disabled = true;
            setTimeout(() => button.disabled = false, 1000);
        }

        const amount = getAmount(dono.amount.currency, dono.amount.value);
        newdonos.push(createElem("div", dono.read ? ["card", "read"] : ["card"], undefined, (e) => e.id = "dono-" + dono.id, [
            createElem("h2", ["title"], undefined, undefined, [
                createElem("span", ["name"], dono.donor_name),
                createElem("span", ["donated"], " donated "),
                createElem("span", ["amount"], amount[0]),
                createElem("span", ["amount", "amount-gbp"], amount[1] ? ` (${amount[1]})` : "")
            ]),
            createElem("p", ["message"], dono.donor_comment || "No Message"),
            button
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