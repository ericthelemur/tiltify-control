module.exports = function (nodecg) {
    function equivListOfObjects(list1, list2) {
        if (list1 === list2) return true;
        if (list1.length != list2.length) return false;
        if (list1.every((v, i) => v === list2[i])) return true;
        return JSON.stringify(list1) === JSON.stringify(list2);
    }

    const approvedDonationsRep = nodecg.Replicant("approvedDonations", { persistent: true, defaultValue: [] });
    const donationsRep = nodecg.Replicant("donations", "nodecg-tiltify");

    var conversionRates = {};

    function convertAmounts() {
        for (var dono of donationsRep.value) {
            if (dono.amountDisplay === undefined && conversionRates && dono.amount.currency in conversionRates) {
                dono.amountDisplay = dono.amount.value / conversionRates[dono.amount.currency]
            }
        }
    }

    fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.conversionRateKey}&base_currency=${nodecg.bundleConfig.displayCurrency}`)
        .then((r) => r.json())
        .then((j) => {
            conversionRates = j.data;
            console.log(conversionRates);
            convertAmounts();
        });

    donationsRep.on("change", (newval) => {
        console.log("changed donations", newval);
        convertAmounts();

        if (nodecg.bundleConfig.donoWhitelist) {
            const approvedDonos = donationsRep.value.filter((d) => d.approved);
            if (!equivListOfObjects(approvedDonos, approvedDonationsRep.value)) {
                approvedDonationsRep.value = approvedDonos;
            }
        }
    })
};
