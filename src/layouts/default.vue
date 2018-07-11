<script>
  import { G } from '~/js/data.js'
  
  export default {
    data() {
      return {
        g: G
      }
    },
    mounted() {
      tezbridge({method: 'public_key_hash', noalert: true})
      .then(x => this.g.admin = x)
      .catch(() => {})
    }
  }
</script>

<template>
  <div class="wrapper">
    <div class="logo">
      tez deployer {{g.admin ? `: ${g.admin}` : ''}}
    </div>
    <nuxt />
  </div>
</template>

<style>
* {margin: 0; padding: 0; vertical-align: middle; font-family: 'Lato'; font-size: 14px; outline: none; transition: all 0.25s ease}
button {border: 1px solid black; background: transparent; padding: 4px 8px; box-shadow: 1px 1px 0px 0px black}
button:hover {box-shadow: 3px 3px 0px 0px black}
button:active {box-shadow: 0px 0px 0px 0px black}
</style>

<style scoped>
.wrapper {width: 1200px; margin: 0 auto;}
.logo {font-size: 16px; font-weight: 900; margin: 8px 0;}
</style>

<style>
@font-face {
    font-family: 'Lato';
    src: url('../webfonts/Lato-Regular.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Lato';
    src: url('../webfonts/Lato-Black.woff2') format('woff2');
    font-weight: 900;
    font-style: normal;
}
</style>