<script setup lang="ts">
import Functions from "./components/Functions/Functions.vue";
import Display from "./components/Display/Display.vue";
import Track from "./components/Track/Track.vue";



</script>

<template>
  <div class="free-video-cut">
    <main class="main">
      <div class="functions">
        <Functions />
      </div>
      <div class="display">
        <Display />
      </div>
    </main>
    <footer class="footer">
      <Track />
    </footer>
  </div>
</template>

<style scoped lang="stylus">
  .free-video-cut
    height: 100vh;
    width: 100vw;
    background-color #0d0c0f
    overflow: hidden;

    .main
      display: flex;
      width: 100%;
      height: 60%;

      .functions
        flex: 0 0 30%;
        overflow hidden

      .display
        flex: 0 0 70%;
        overflow hidden

  
    .footer
      width: 100%;
      height: 40%;
      overflow hidden

</style>
<style>
  body {
    margin: 0 !important;
  }

  body * {
      box-sizing: border-box;
  }
</style>