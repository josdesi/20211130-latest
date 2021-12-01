const flatten = use('flat');

const messages = {
  validation: {
    //Common
    required: '{field} must be provided.',
    required_if: '{field} must be provided if {reason}',
    type: 'The type of {field} should be {type}.',
    notExist: 'There is no {entity} that matches the provided key.',
    format: '{field} should match the required format : {format}',
    invalid: {
      single: '{field} does not match any of the existing values.',
      multiple: 'A record from provided {parent} contains a {field} that does not match any of the existing values.',
    },
    unique: '{field} value of {value} is already registered, please verify and try again.',
    range: '{field} must be between {lowerRange} and {highRange}',
    withOutAll: 'At least one field is required to {action} the {entity}',
    max: '{field} has a limit of {size} characters',
    //Placement
    splitPercent: 'The total of all splits should sum up {total}%.',
    splitRepeatedUser: "A user from the {type}'s split is repeated!, remove one and try again.",
    requestFallOff: 'A regional needs to request first to be able to {action} this placement',
  },
  error: {
    //Common
    internalServer: 'There was a problem {action} the {entity}.',
    authorization: "Your account doesn't have the permissions to use the resource.",
    notFound: 'The {entity} was not found.',
    duplicate: 'The {entity} already exists.',

    //Bulk
    activityFromSystem: 'The activity you are trying to edit was automatically generated by Fortpac',
    microsoftgraph: {
      logOut: 'Please, log out & log in to have access to the {service}',
      tokenExpired: 'Your Outlook token expired! Please, sign out & log in again to be able to continue',
      genericError: 'Something went wrong while using Microsoft Graph',
      genericOnBehalfError:
        "Something went wrong while using the on behalf service, please contact Fortpac Support's Glip",
      forbiddenOnBehalf: 'The user cannot use on behalf functionality',
    },
    user: {
      errorCreation: 'Error During the User Creation',
      gettingUser: 'Error getting the User',
      errorLogin: 'There was a problem while login into your account.',
    },
    //Sendout
    sendout: {
      creation: {
        title: 'Error with the {entity} Module',
      },
      conversion: {
        title: 'Error with conversion of Sendover',
      },
      delete: {
        title: 'Error while deleting the {entity}',
      },
      message: "Contact Fortpac Support's Glip and attach the Job Order's link for help.",
    },
    //Hiring Authority
    hiringAuthority: {
      assigned: 'The Hiring Authority is already assigned to this Company',
    },
  },
  success: {
    //Common
    creation: '{entity} created successfully!',
    update: '{entity} updated successfully!',
    delete: '{entity} deleted successfully!',
    removed: '{entity} removed successfully!',
  },
  loading: {
    phoneDashboard: {
      LastUpdateEnd: 'New update in phone dashboard',
    },
  },
  configuration: {
    noKey: 'No configuration for key {key}'
  }
};

module.exports = flatten(messages);
