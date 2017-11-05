const defaults = {
  duration: 250,
  easing: 'ease-out',
  fade: true,
  from: 0.3,
  to: 1
}

export default function scale (t, params) {
  const options = t.processParams(params, defaults)
  const scaleFrom = `scale(${options.from})`
  const scaleTo = `scale(${options.to})`

  let targetOpacity

  if (t.isIntro) {
    t.setStyle('transform', scaleFrom)

    if (t.fade !== false) {
      targetOpacity = t.getStyle('opacity')
      t.setStyle('opacity', 0)
    }
  }

  const anim = {
    opacity: t.isIntro ? targetOpacity : 0
  }

  if (t.fade !== false) anim.transform = t.isIntro ? scaleTo : scaleFrom

  t.animateStyle(anim, options, t.complete)
}
