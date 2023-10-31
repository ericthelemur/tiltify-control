
// TODO convert to messages
const APPROVED = true, UNDECIDED = undefined, CENSORED = false;

function tripleState(v, appVal, undecVal, cenVal) {
    // Shorthand for setting a value for each of the 3 mod states
    return v === APPROVED ? appVal : (v === CENSORED ? cenVal : undecVal);
}

function modAction(dono) {
    // Triggers the main mod action (approve/censor)
    if (nodecg.bundleConfig.donoWhitelist) {
        // Unknown & censored => accepted, accepted => censored
        return () => { dono.timeToApprove = 8.64e15; dono.modStatus = tripleState(dono.modStatus, CENSORED, APPROVED, APPROVED) };
    } else {
        // Unknown & accepted => censored, censored => accepted
        return () => { dono.timeToApprove = 8.64e15; dono.modStatus = tripleState(dono.modStatus, CENSORED, CENSORED, APPROVED) };
    }
}

function bonus(dono) {
    // Triggers the bonus mod action
    return () => {
        dono.timeToApprove = 8.64e15;   // Max date
        const whitelist = nodecg.bundleConfig.donoWhitelist;
        dono.modStatus = tripleState(dono.modStatus, UNDECIDED, whitelist ? CENSORED : APPROVED, UNDECIDED);
    }
}

function read(dono) {
    // Mark a dono read or toggle
    if (!dono.read) {
        return () => nodecg.sendMessageToBundle('mark-donation-as-read', 'nodecg-tiltify', dono);
    } else {
        return () => dono.read = false;
    }
}

function createButtons(dono, changed) {
    // Main mod action button -- either approve or censor based on mode
    var censorBtn;
    const whitelist = nodecg.bundleConfig.donoWhitelist;
    if (whitelist) {
        censorBtn = createButton(dono.modStatus !== APPROVED, "Approve", "check-lg", "Censor", "ban", modAction(dono), ["rounded-start"]);
    } else {
        censorBtn = createButton(dono.modStatus !== CENSORED, "Censor", "ban", "Approve", "check-lg", modAction(dono), ["rounded-start"]);
        // censorBtn.classList.replace("btn-primary", "btn-outline-primary");
        // If blacklisting, initiate count to auto-approval
        if (dono.modStatus === UNDECIDED) {
            censorBtn.classList.add("censor-btn");
            censorBtn.dataset.timeToApprove = dono.timeToApprove;
            censorBtn.dataset.donoId = dono.id;
            updateCensorBtnTime(censorBtn);
        } else {
            censorBtn.classList.replace("btn-primary", "btn-outline-primary");
        }
    }

    // Create button row
    const btnGroup = createElem("div", ["btn-group"], undefined, (e) => e.role = "group", [
        createButton(!dono.read, "Read", "envelope-open-fill", "Unread", "envelope-fill", read(dono), ["me-2", "rounded-end"]),
        censorBtn,
        // Bonus mod button (set to the 3rd state, usually reset to undecided)
        createElem("button", ["btn", "btn-outline-primary", "bonus-btn"], undefined, (e) => e.addEventListener("click", bonus(dono)), [
            ...createIcon(tripleState(dono.modStatus, "arrow-counterclockwise", whitelist ? "ban" : "check-lg", "arrow-counterclockwise")),
            createElem("small", ["rem-time"])
        ])
    ]);
    // Disable buttons for 0.5s if the element has moved (avoids misclicks)
    if (changed) {
        [].forEach.call(btnGroup.children, (e) => e.disabled = true);
        setTimeout(() => [].forEach.call(btnGroup.children, (e) => e.disabled = false), 500);
    }

    return btnGroup;
}

function updateCensorBtnTime(btn) {
    // Move progress bar on auto button
    // Calculate remaining time
    const now = Date.now();
    if (now > btn.dataset.timeToApprove) return;
    const target = btn.dataset.timeToApprove;
    const windowSec = nodecg.bundleConfig.blacklistWindowSec;
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
    for (const btn of document.getElementsByClassName("censor-btn")) {
        updateCensorBtnTime(btn);
    }
}, 250);