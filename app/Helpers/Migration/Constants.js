/*
  The field columns are the values that the API need to migrate the data , inside each value
  comes the possible column reference on each type of migration (PCR,ZoomInfo , etc..),
  that does not mean that other colum name can be used for each value.
*/
const companyFieldColumns = {
  name: {
    ZoomInfo: 'Company Name',
    PCR: 'Company Name',
    required: true
  },
  phone: {
    ZoomInfo: 'Company HQ Phone',
    PCR: 'Phone',
    required: true
  },
  state: {
    ZoomInfo: 'Person State',
    PCR: 'State',
    required: true
  },
  city: {
    ZoomInfo: 'Person City',
    PCR: 'City',
    required: true
  },
  zip: {
    ZoomInfo: 'Person Zip Code',
    PCR: 'Zip',
    required: true
  },
  address: {
    ZoomInfo: 'Person Street',
    PCR: 'Address',
    required: true
  },
  country: {
    ZoomInfo: 'Country',
    PCR: 'Country',
    required: true
  },
  industry: {
    ZoomInfo: 'Industry',
    PCR: 'Industry',
    required: true
  },
  specialty: {
    ZoomInfo: 'Specialty',
    PCR: 'Specialty',
    required: true
  },
  subspecialty: {
    ZoomInfo: 'Subspecialty',
    PCR: 'Subspecialty',
    required: true
  },
  status: {
    ZoomInfo: 'Status',
    PCR: 'Status',
    required: true
  },
  website: {
    ZoomInfo: 'Website',
    PCR: 'Website',
    required: false
  },
  initials: {
    ZoomInfo: 'User Name',
    PCR: 'User Name',
    required: true
  },
  city_pcr: {
    PCR: 'CityPCR',
    required: true
  },
  state_pcr: {
    PCR: 'StatePCR',
    required: true
  }
};

const contactsFieldColumns = {
  firstName:{
    ZoomInfo: 'First Name',
    PCR: 'FirstName',
    required: true
  },
  lastName: {
    ZoomInfo: 'Last Name',
    PCR: 'LastName',
    required: true
  },
  email: {
    ZoomInfo: 'Email Address',
    PCR: 'EmailAddress',
    required: true
  },
  otherEmail: {
    ZoomInfo: 'email_other',
    PCR: 'email_other',
    required: true
  },
  workPhone: {
    ZoomInfo: 'Direct Phone Number',
    PCR: 'WorkPhone',
    required: true
  },
  mobilePhone: {
    ZoomInfo: 'Mobile phone',
    PCR: 'MobilePhone',
    required: false
  },
  state: {
    ZoomInfo: 'Person State',
    PCR: 'State',
    required: true
  },
  city: {
    ZoomInfo: 'Person City',
    PCR: 'City',
    required: true
  },
  zip: {
    ZoomInfo: 'Person Zip Code',
    PCR: 'PostalCode',
    required: true
  },
  address: {
    ZoomInfo: 'Person Street',
    PCR: 'Address',
    required: false
  },
  country: {
    ZoomInfo: 'Country',
    PCR: 'Country',
    required: true
  },
  industry: {
    ZoomInfo: 'Industry',
    PCR: 'Industry',
    required: true
  },
  specialty: {
    ZoomInfo: 'Specialty',
    PCR: 'Specialty',
    required: true
  },
  subspecialty: {
    ZoomInfo: 'Subspecialty',
    PCR: 'Subspecialty',
    required: true
  },
  currentCompany: {
    ZoomInfo: 'Company Name',
    PCR: 'CurrentCompany',
    required: true
  },
  functionalTitle: {
    ZoomInfo: 'Functional Title',
    PCR: 'Functional Title',
    required: true
  },
  title: {
    ZoomInfo: 'Job Title',
    PCR: 'Title',
    required: true
  },
  status: {
    ZoomInfo: 'Status',
    PCR: 'Status',
    required: true
  },
  companyId: {
    ZoomInfo: 'CompanyId',
    PCR: 'CompanyId',
    required: true
  },
  initials: {
    ZoomInfo: 'User Name',
    PCR: 'User Name',
    required: true
  },
  linkedInURL: { 
    ZoomInfo: 'LinkedIn URL',
    required: false
  }
}

const searchProjectFieldColumns = {
  email: {
    PCR: 'EmailAddress',
    required: true
  },
  firstName:{
    PCR: 'FirstName',
    required: false
  },
  lastName: {
    PCR: 'LastName',
    required: false
  },
  status: {
    PCR: 'Status',
    required: false
  },
};

const sourceTypes = {
  PCR: {
    title: 'PCR',
    id: 0,
  },
  ZoomInfo: {
    title: 'ZoomInfo',
    id: 1,
  },
};


const getFieldsBytype = (columnFields, type) => {
  const columnsByType = {};
  Object.keys(columnFields).forEach((property) =>{
    const { [type]: column, required } = columnFields[property];
    if(column){
      columnsByType[property] = {
        column,
        required
      }
    }
  })
  return columnsByType;
}

module.exports = {
  companyFieldColumns,
  contactsFieldColumns,
  searchProjectFieldColumns,
  sourceTypes,
  getFieldsBytype
};
