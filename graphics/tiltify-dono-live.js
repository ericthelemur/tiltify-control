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

// Fetch conversion rates
var conversionRates = {};
fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.conversionRateKey}&base_currency=${nodecg.bundleConfig.displayCurrency}`)
    .then((r) => r.json())
    .then((j) => conversionRates = j.data)

// Format value for display
function getAmount(currency, value) {
    const canConvert = conversionRates && currency in conversionRates;
    return [
        baseCurrFormat(currency).format(value),
        canConvert ? displayCurrFormat.format(value / conversionRates[currency]) : null
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
const newestFirstElem = document.getElementById("newest");

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
    if (newestFirstElem.checked) newvalue = newvalue.slice().reverse();
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

        const button = createElem("button", ["btn", dono.read ? "btn-outline-primary" : "btn-primary"]);
        button.innerHTML = `<i class='bi bi-envelope-${dono.read ? "" : "open-"}fill'></i> ${dono.read ? "Unr" : "R"}ead`
        button.addEventListener("click", read(dono));
        if (changed) {
            button.disabled = true;
            setTimeout(() => button.disabled = false, 1000);
        }

        const amount = getAmount(dono.amount.currency, dono.amount.value);
        const date = new Date(dono.completed_at);
        const cardClasses = ["card"];
        if (dono.read) cardClasses.push("read");
        newdonos.push(createElem("div", cardClasses, undefined, (e) => e.id = "dono-" + dono.id, [
            createElem("div", ["card-body"], undefined, undefined, [
                createElem("h2", ["h5", "card-title"], undefined, undefined, [
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
                button
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