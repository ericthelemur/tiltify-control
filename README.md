# tiltify-control

Tiltify Control provides a donation reader and moderation interface for Tiltify Donations. Both as a reliable donation reader and to allow approval/censorship of donation messages before they are shown on stream. 

By default, it requires manual approval of each message before it is displayed, however if the auto approval setting is on, messages are automatically approved if not censored within the time window configured (default: 15s).

There are fairly extensive filtering options too: options to allow any of read & unread, approved, censored, unmoderated, and sort by time or money ascending or descending. Viewing the `allDonations` list (no moderation) or donations by top donors are options too.

![example.png](example.png)

tiltify-control is a [NodeCG](http://github.com/nodecg/nodecg) bundle for `^1.9.0`. It requires [ericthelemur/nodecg-tiltify](https://github.com/ericthelemur/nodecg-tiltify) to fetch the Tiltify data (a minor fork of [daniellockard/nodecg-tiltify](https://github.com/daniellockard/nodecg-tiltify)).


