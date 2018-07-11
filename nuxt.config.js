module.exports = {
  srcDir: 'src/',
  head: {
    title: 'tez deploy',
    meta: [
      {charset: 'utf-8'},
      {name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'},
      {name: 'description', content: 'Online contract deployer for Tezos'}
    ],
    script: [
      {src: 'https://www.tezbridge.com/plugin.js'}
    ]
  }
}