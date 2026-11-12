<template>
  <div class="app">
    <header>
      <div class="brand">B1ADE<span>DEV</span><small>SURVIVAL SYSTEM</small></div>
      <nav>
        <RouterLink to="/inventory">INVENTORY</RouterLink>
        <RouterLink to="/crafting">CRAFTING</RouterLink>
        <RouterLink to="/character">CHARACTER</RouterLink>
        <RouterLink to="/add">ADD ITEMS</RouterLink>
        <RouterLink to="/settings">SETTINGS</RouterLink>
        <RouterLink to="/account">ACCOUNT / API</RouterLink>
      </nav>
      <RouterLink class="status account-link" to="/account">● ACCOUNT</RouterLink>
    </header>
    <main><RouterView /></main>
    <footer>ESC — CLEAR SELECTION &nbsp; I — INVENTORY &nbsp; R — SORT</footer>
  </div>
</template>