// Helper function to create nested div structure
// Many JS frameworks have similar, but keeping no dependencies
function createElem(tag, classes = [], content = undefined, post_hook = undefined, children = []) {
    const elem = document.createElement(tag);
    for (const c of classes) {
        elem.classList.add(c);
    }
    if (content) elem.innerHTML = content;
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
    console.log(conversionRates);
    const canConvert = conversionRates && currency in conversionRates;
    return [
        baseFormat(currency).format(value),
        canConvert ? displayFormat.format(value / conversionRates[currency]) : null
    ]
}

var donations = [];
var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");
donationRep.on("change", function (newvalue, oldvalue) {
    donations = newvalue;
    var donoElem = document.getElementById("donations");

    var newdonos = [];
    for (var dono of newvalue) {
        if (dono.read) continue;

        const amount = getAmount(dono.amount.currency, dono.amount.value);
        newdonos.push(createElem("div", ["card"], undefined, (e) => e.id = "dono-" + dono.id, [
            createElem("h2", ["name"], `${dono.donor_name} donated ${amount[0]}` + (amount[1] ? ` (${amount[1]})` : "")),
            createElem("p", ["message"], dono.donor_comment || "No Message"),
            createElem("button", [], "Mark as read", (e) => e.addEventListener("click", () => nodecg.sendMessageToBundle('mark-donation-as-read', 'nodecg-tiltify', dono)))
        ]))
    }

    donoElem.replaceChildren(...newdonos);
});
document.getElementById("clear-donations").addEventListener("click", (e) => {
    var confirmClear = confirm("Are you sure you want to clear all donations for all readers?")
    if (confirmClear == true) {
        nodecg.sendMessageToBundle('clear-donations', 'nodecg-tiltify');
    }
})