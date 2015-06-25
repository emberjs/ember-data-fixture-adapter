import DS from 'ember-data';

const User = DS.Model.extend({
  name: DS.attr()
});

User.reopenClass({
  FIXTURES: [
    {
      id: 1,
      name: 'Monkey'
    },

    {
      id: 2,
      name: 'Marvin'
    },
    {
      id: 3,
      name: 'Marvin'
    }
  ]
});

export default User;
