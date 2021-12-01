/*
|country_id map
|   1 : US
|   2 : CA
|   3 : MX
|   4 : UK
|Coordinates (Long,Lat)
*/

const statesAndProvinces = [
  //Unites States
  { id: 1, country_id: 1, title: 'Alabama', slug: 'AL', coordinates: '(-86.726531,33.073433)' },
  { id: 2, country_id: 1, title: 'Alaska', slug: 'AK', coordinates: '(-151.863722,65.674807)' },
  { id: 3, country_id: 1, title: 'Arizona', slug: 'AZ', coordinates: '(-111.811344,34.501844)' },
  { id: 4, country_id: 1, title: 'Arkansas', slug: 'AR', coordinates: '(-92.507547,34.911728)' },
  { id: 5, country_id: 1, title: 'California', slug: 'CA', coordinates: '(-119.931561,37.009002)' },
  { id: 6, country_id: 1, title: 'Colorado', slug: 'CO', coordinates: '(-105.640827,39.010602)' },
  { id: 7, country_id: 1, title: 'Connecticut', slug: 'CT', coordinates: '(-72.680749,41.661711)' },
  { id: 8, country_id: 1, title: 'Delaware', slug: 'DE', coordinates: '(-75.563041,39.037553)' },
  { id: 9, country_id: 1, title: 'District Of Columbia', slug: 'DC', coordinates: '(-77.015272,38.917558)' },
  { id: 10, country_id: 1, title: 'Florida', slug: 'FL', coordinates: '(-81.576378,28.124672)' },
  { id: 11, country_id: 1, title: 'Georgia', slug: 'GA', coordinates: '(-83.499655,32.759839)' },
  { id: 12, country_id: 1, title: 'Hawaii', slug: 'HI', coordinates: '(-155.530812,19.702647)' },
  { id: 13, country_id: 1, title: 'Idaho', slug: 'ID', coordinates: '(-114.358545,44.111518)' },
  { id: 14, country_id: 1, title: 'Illinois', slug: 'IL', coordinates: '(-89.231356,40.057543)' },
  { id: 15, country_id: 1, title: 'Indiana', slug: 'IN', coordinates: '(-86.179924,39.896839)' },
  { id: 16, country_id: 1, title: 'Iowa', slug: 'IA', coordinates: '(-93.600714,42.096077)' },
  { id: 17, country_id: 1, title: 'Kansas', slug: 'KS', coordinates: '(-98.333465,38.623438)' },
  { id: 18, country_id: 1, title: 'Kentucky', slug: 'KY', coordinates: '(-85.254326,37.54884)' },
  { id: 19, country_id: 1, title: 'Louisiana', slug: 'LA', coordinates: '(-92.502356,31.341148)' },
  { id: 20, country_id: 1, title: 'Maine', slug: 'ME', coordinates: '(-69.110133,45.434324)' },
  { id: 21, country_id: 1, title: 'Maryland', slug: 'MD', coordinates: '(-76.83354,39.279279)' },
  { id: 22, country_id: 1, title: 'Massachusetts', slug: 'MA', coordinates: '(-71.824228,42.338774)' },
  { id: 23, country_id: 1, title: 'Michigan', slug: 'MI', coordinates: '(-84.718591,43.543087)' },
  { id: 24, country_id: 1, title: 'Minnesota', slug: 'MN', coordinates: '(-94.621458,46.019267)' },
  { id: 25, country_id: 1, title: 'Mississippi', slug: 'MS', coordinates: '(-89.703765,32.902373)' },
  { id: 26, country_id: 1, title: 'Missouri', slug: 'MO', coordinates: '(-92.329988,38.498564)' },
  { id: 27, country_id: 1, title: 'Montana', slug: 'MT', coordinates: '(-109.535841,47.020397)' },
  { id: 28, country_id: 1, title: 'Nebraska', slug: 'NE', coordinates: '(-99.536571,41.66009)' },
  { id: 29, country_id: 1, title: 'Nevada', slug: 'NV', coordinates: '(-116.879875,39.322838)' },
  { id: 30, country_id: 1, title: 'New Hampshire', slug: 'NH', coordinates: '(-71.579499,43.725911)' },
  { id: 31, country_id: 1, title: 'New Jersey', slug: 'NJ', coordinates: '(-74.540194,40.152238)' },
  { id: 32, country_id: 1, title: 'New Mexico', slug: 'NM', coordinates: '(-106.060234,34.57426)' },
  { id: 33, country_id: 1, title: 'New York', slug: 'NY', coordinates: '(-75.11332,42.942261)' },
  { id: 34, country_id: 1, title: 'North Carolina', slug: 'NC', coordinates: '(-79.037873,35.513401)' },
  { id: 35, country_id: 1, title: 'North Dakota', slug: 'ND', coordinates: '(-100.315381,47.594323)' },
  { id: 36, country_id: 1, title: 'Ohio', slug: 'OH', coordinates: '(-82.891598,40.090038)' },
  { id: 37, country_id: 1, title: 'Oklahoma', slug: 'OK', coordinates: '(-97.256181,35.458897)' },
  { id: 38, country_id: 1, title: 'Oregon', slug: 'OR', coordinates: '(-120.695324,43.968139)' },
  { id: 39, country_id: 1, title: 'Pennsylvania', slug: 'PA', coordinates: '(-77.706145,40.995788)' },
  { id: 40, country_id: 1, title: 'Rhode Island', slug: 'RI', coordinates: '(-71.583226,41.71197)' },
  { id: 41, country_id: 1, title: 'South Carolina', slug: 'SC', coordinates: '(-81.014796,34.062808)' },
  { id: 42, country_id: 1, title: 'South Dakota', slug: 'SD', coordinates: '(-100.293468,44.716169)' },
  { id: 43, country_id: 1, title: 'Tennessee', slug: 'TN', coordinates: '(-86.341765,35.960561)' },
  { id: 44, country_id: 1, title: 'Texas', slug: 'TX', coordinates: '(-98.947471,31.203659)' },
  { id: 45, country_id: 1, title: 'Utah', slug: 'UT', coordinates: '(-111.684286,39.240352)' },
  { id: 46, country_id: 1, title: 'Vermont', slug: 'VT', coordinates: '(-72.737743,43.897948)' },
  { id: 47, country_id: 1, title: 'Virginia', slug: 'VA', coordinates: '(-78.794527,37.483247)' },
  { id: 48, country_id: 1, title: 'Washington', slug: 'WA', coordinates: '(-120.336778,47.527715)' },
  { id: 49, country_id: 1, title: 'West Virginia', slug: 'WV', coordinates: '(-80.700761,38.710341)' },
  { id: 50, country_id: 1, title: 'Wisconsin', slug: 'WI', coordinates: '(-89.731433,44.453081)' },
  { id: 51, country_id: 1, title: 'Wyoming', slug: 'WY', coordinates: '(-107.617434,43.136953)' },
  { id: 52, country_id: 3, title: 'Guanajuato', slug: 'GTO', coordinates: '(-101.258,21.0181)' }, //Mexican State used to map users that works there
  { id: 53, country_id: 1, title: 'American Samoa', slug: 'AS', coordinates: '(-170.132217,-14.270972)' },
  { id: 54, country_id: 1, title: 'Guam', slug: 'GU', coordinates: '(144.793731,13.444304)' },
  { id: 55, country_id: 1, title: 'Northern Mariana Islands', slug: 'MP', coordinates: '(145.38469,17.33083)' },
  { id: 56, country_id: 1, title: 'Puerto Rico', slug: 'PR', coordinates: '(-66.590149,18.220833)' },
  { id: 57, country_id: 1, title: 'U.S. Virgin Islands', slug: 'VI', coordinates: '(-64.896335,18.335765)' },

  //Canada
  { id: 58, country_id: 2, title: 'Alberta', slug: 'AB', coordinates: '(-119.4839362,54.4216961)' },
  { id: 59, country_id: 2, title: 'British Columbia', slug: 'BC', coordinates: '(-131.0395261,54.0353631)' },
  { id: 60, country_id: 2, title: 'Manitoba', slug: 'MB', coordinates: '(-99.9426004,54.422845)' },
  { id: 61, country_id: 2, title: 'New Brunswick', slug: 'NB', coordinates: '(-68.5929831,46.1804241)' },
  { id: 62, country_id: 2, title: 'Newfoundland and Labrador', slug: 'NL', coordinates: '(-68.8663818,52.7478682)' },
  { id: 63, country_id: 2, title: 'Northwest Territories', slug: 'NT', coordinates: '(-136.7795019,68.9027202)' },
  { id: 64, country_id: 2, title: 'Nova Scotia', slug: 'NS', coordinates: '(-65.1139557,44.054772)' },
  { id: 65, country_id: 2, title: 'Nunavut', slug: 'NU', coordinates: '(-123.5315433,63.9018759)' },
  { id: 66, country_id: 2, title: 'Ontario', slug: 'ON', coordinates: '(-93.7026968,48.9700266)' },
  { id: 67, country_id: 2, title: 'Prince Edward Island', slug: 'PE', coordinates: '(-63.674341,46.6675871)' },
  { id: 68, country_id: 2, title: 'Quebec', slug: 'QC', coordinates: '(-71.4817746,46.8565177)' },
  { id: 69, country_id: 2, title: 'Saskatchewan', slug: 'SK', coordinates: '(-110.1687773,54.4227669)' },
  { id: 70, country_id: 2, title: 'Yukon', slug: 'YT', coordinates: '(-141.330653,64.9911724)' },

  //United Kingdom (special case, seems like we'll return to api at the end, but for now)
  { id: 71, country_id: 4, title: 'Cambridgeshire', slug: 'CAM', coordinates: '(0.12170339100756854,52.2071481427847)' },
];


module.exports = {
  statesAndProvinces
};