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
            if (dono.amountDisplay === undefined) {
                if (conversionRates && dono.amount.currency in conversionRates) {
                    dono.amountDisplay = dono.amount.value / conversionRates[dono.amount.currency]
                } else if (dono.amount.currency == nodecg.bundleConfig.displayCurrency) {
                    // If rates not provided, can do trivial conversion
                    dono.amountDisplay = dono.amount.value
                }
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
        console.log("changed donations", newval[0]);
        convertAmounts();

        if (nodecg.bundleConfig.donoWhitelist) {
            // Ensure auto approve date is never hit (so can switch to blacklist safely)
            for (const dono of newval) {
                if (dono.timeToApprove != 8.64e15) {
                    dono.timeToApprove = 8.64e15;
                }
            }
        } else {    // Blacklist, mark auto approval time
            const now = Date.now();
            for (const dono of newval) {
                if (dono.timeToApprove === undefined) {
                    dono.timeToApprove = now + nodecg.bundleConfig.blacklistWindowSec * 1000;
                }
            }
        }
        // const approvedDonos = donationsRep.value.filter((d) => d.approved);
        // if (!equivListOfObjects(approvedDonos, approvedDonationsRep.value)) {
        //     approvedDonationsRep.value = approvedDonos;
        // }
    })

    if (!nodecg.bundleConfig.donoWhitelist) {
        // If blacklist, poll for the approval time passing
        setInterval(() => {
            const now = Date.now();
            for (const dono of donationsRep.value) {
                if (dono.modStatus === undefined && dono.timeToApprove < now) {
                    nodecg.log.info(`Donation ${dono.id} marked as approved as time has passed`);
                    dono.modStatus = true;
                }
            }
        }, 1000)

    }
};
