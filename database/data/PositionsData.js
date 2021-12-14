const positions = [
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Partner',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Principal',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Tax manager',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Tax senior',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Tax associate',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Audit manager',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Audit senior',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'Audit associate',
  },
  {
    industry: 'Business',
    specialty: 'Accounting',

    title: 'HR',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Lending',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'IT',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Credit',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Trust/Wealth',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Mortgage',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Retail',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Operations',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'Insurance',
  },
  {
    industry: 'Business',
    specialty: 'Banking',

    title: 'HR',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Owner',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'CEO',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'COO',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Principal',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Director',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'HR',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Account Manager',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Producer',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'CSR',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Account Executive',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Surety',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Risk',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Producer/Consultant',
  },
  {
    industry: 'Business',
    specialty: 'Insurance',

    title: 'Analyst',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Project manager',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Estimator',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Superintendent',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'PE/APM',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Field engineer',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'BIM',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Scheduler',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'Safety',
  },
  {
    industry: 'Construction',
    specialty: 'Commercial',

    title: 'HR',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Project manager',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Estimator',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Superintendent',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'PE/APM',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Field engineer',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'BIM',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Scheduler',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'Safety',
  },
  {
    industry: 'Construction',
    specialty: 'Residential',

    title: 'HR',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Project manager',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Estimator',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Superintendent',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'PE/APM',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Field engineer',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'BIM',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Scheduler',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'Safety',
  },
  {
    industry: 'Construction',
    specialty: 'Industrial',

    title: 'HR',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Project manager',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Estimator',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Superintendent',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'PE/APM',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Field engineer',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'BIM',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Scheduler',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'Safety',
  },
  {
    industry: 'Construction',
    specialty: 'Heavy & Civil',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Civil litigation',

    title: 'HR',
  },

  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Commercial litigation',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Trust & estate',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Labor & employment',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Corporate/Transactional',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'IP',

    title: 'HR',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'Attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'Associate attorney',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'Partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'Managing partner',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'Paralegal',
  },
  {
    industry: 'Legal services',
    specialty: 'Environmental',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Dairy manufacturing',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Food production',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Metals',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Pulp & Paper',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Plastics & Packaging',

    title: 'HR',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'General manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Plant manager',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Engineer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Designer',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Maintenance',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Production',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'EHS',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Quality',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Food safety',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Sales',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Supply chain',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'Logistics',
  },
  {
    industry: 'Manufacturing',
    specialty: 'Aerospace',

    title: 'HR',
  },
];

module.exports = {
  positions
};
