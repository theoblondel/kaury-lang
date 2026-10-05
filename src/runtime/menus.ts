// The only JavaScript of a static page: the phone menu button. Standalone, a few hundred bytes.

/** Adds the phone button to every menu of the page. */
export function installMenus() {
  document.querySelectorAll('.k-menu').forEach((nav) => installMenu(nav))
}

function installMenu(nav: any) {
  if (nav.$kMenu) return
  nav.$kMenu = true
  const b = document.createElement('button')
  b.className = 'k-burger'
  b.type = 'button'
  b.setAttribute('aria-label', document.documentElement.lang?.startsWith('fr') ? 'Menu principal' : 'Main menu')
  b.setAttribute('aria-expanded', 'false')
  b.setAttribute('aria-controls', nav.id)
  b.append(document.createElement('span'), document.createElement('span'), document.createElement('span'))
  nav.parentNode?.insertBefore(b, nav)
  const toggle = (open?: boolean) => {
    const o = open ?? !nav.classList.contains('k-menu-open')
    nav.classList.toggle('k-menu-open', o)
    b.classList.toggle('k-burger-open', o)
    b.setAttribute('aria-expanded', String(o))
  }
  b.addEventListener('click', () => toggle())
  nav.addEventListener('click', (e: Event) => {
    if ((e.target as HTMLElement).closest('a')) toggle(false)
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false)
  })
}
