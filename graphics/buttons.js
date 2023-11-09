
// TODO convert to messages
const APPROVED = true, UNDECIDED = undefined, CENSORED = false;

function tripleState(v, appVal, undecVal, cenVal) {
    // Shorthand for setting a value for each of the 3 mod states
    return v === APPROVED ? appVal : (v === CENSORED ? cenVal : undecVal);
}

function changeModStatus(dono, to) {
    return () => {
        dono.timeToApprove = 8.64e15;
        if (dono.modStatus === CENSORED) {
            var confirmUncensor = confirm("Are you sure you want to uncensor this donation?" + `\nName: ${dono.donor_name}\nMessage: ${dono.donor_comment}`);
            if (confirmUncensor != true) return;
        }
        dono.modStatus = to;
    }
}

function modAction(dono, defApprove) {
    // Triggers the main mod action (approve/censor)
    return changeModStatus(dono, tripleState(dono.modStatus, CENSORED, defApprove ? APPROVED : CENSORED, APPROVED));
}

function bonus(dono, defApprove) {
    // Triggers the bonus mod action
    return changeModStatus(dono, tripleState(dono.modStatus, UNDECIDED, defApprove ? CENSORED : APPROVED, UNDECIDED));
}

function read(dono) {
    // Mark a dono read or toggle
    if (!dono.read) {
        return () => nodecg.sendMessageToBundle('mark-donation-as-read', 'nodecg-tiltify', dono);
    } else {
        return () => dono.read = false;
    }
}

var timerButtons = [];
var buttonGroups = [];
function createButtons(dono) {
    // Main mod action button -- either approve or censor based on mode
    var censorBtn;
    const whitelist = !settingsRep.value.autoapprove || dono.timeToApprove === 8.64e15;
    if (whitelist) {
        censorBtn = createButton(dono.modStatus !== APPROVED, "Approve", icons.approved, "Censor", icons.censored,
            modAction(dono, dono.modStatus === APPROVED), ["rounded-start"]);
    } else {
        censorBtn = createButton(dono.modStatus !== CENSORED, "Censor", icons.censored, "Approve", icons.approved,
            modAction(dono, dono.modStatus === CENSORED), ["rounded-start"]);

        // If blacklisting, initiate count to auto-approval
        if (dono.modStatus === UNDECIDED) {
            censorBtn.classList.add("censor-btn");
            censorBtn.dataset.timeToApprove = dono.timeToApprove;
            censorBtn.dataset.donoId = dono.id;
            updateCensorBtnTime(censorBtn);
            timerButtons.push(censorBtn);
        } else {
            censorBtn.classList.replace("btn-primary", "btn-outline-primary");
        }
    }

    // Create button row
    const btnGroup = createElem("div", ["btn-group"], undefined, (e) => e.role = "group", [
        createButton(!dono.read, "Read", icons.read, "Unread", icons.unread, read(dono), ["me-2", "rounded-end"]),
        censorBtn,
        // Bonus mod button (set to the 3rd state, usually reset to undecided)
        createElem("button", ["btn", "btn-outline-primary", "bonus-btn"], undefined, (e) => e.addEventListener("click", bonus(dono, whitelist)), [
            ...createIcon(tripleState(dono.modStatus, "arrow-counterclockwise", whitelist ? icons.censored : icons.approved, "arrow-counterclockwise")),
            createElem("small", ["rem-time"])
        ])
    ]);
    buttonGroups.push(btnGroup);

    return btnGroup;
}

function updateCensorBtnTime(btn) {
    // Move progress bar on auto button
    // Calculate remaining time
    const now = Date.now();
    const target = parseInt(btn.dataset.timeToApprove)
    if (now > target || target === 8.64e15) return;
    const windowSec = nodecg.bundleConfig.autoApproveTimeSec;
    const facDone = Math.round((target - now) / (windowSec * 10));
    const facLimit = 100 - Math.max(0, Math.min(100, facDone));
    btn.style.setProperty("--progress", `${facLimit}%`);

    // Set time property
    const bonusBtn = btn.nextSibling;
    if (bonusBtn && bonusBtn.classList.contains("bonus-btn")) {
        if (!bonusBtn.classList.contains("rem-time")) bonusBtn.classList.add("rem-time")
        bonusBtn.children[1].innerText = `(${Math.round((target - now) / 1000)}s)`
    }
}

setInterval(() => {
    for (const btn of timerButtons) {
        if (btn.dataset.timeToApprove)
            updateCensorBtnTime(btn);
    }
}, 250);