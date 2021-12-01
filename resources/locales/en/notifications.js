const flatten = use('flat');

const notifications = {
  placement: {
    creation: {
      coach: {
        title: "{recruiterName} Registered A New Placement",
        body: "Approve or Suggest An Update."
      }
    },
    suggestionUpdate: {
      recruiter: {
        title: "Placement update requested by {userName}",
        body: "Update Placement."
      }
    },
    updated: {
      coach: {
        title: "{recruiterName} Has Updated A Placement",
        body: "Approve or Suggest another Update."
      }
    },
    approve: {
      finance: {
        title: "{recruiterName} Registered A New Placement",
        body: "View Placement."
      }
    }
  },

}


module.exports = flatten(notifications);