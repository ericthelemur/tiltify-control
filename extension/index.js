module.exports = function (nodecg) {

    var donationsRep = nodecg.Replicant("donations", "nodecg-tiltify");
    donationsRep.on("change", (newval) => {
        console.log("changed donations", newval);
    })
};
