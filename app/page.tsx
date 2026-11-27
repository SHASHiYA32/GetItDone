"use client";
import { Banknote, CreditCard, FileCheck2, Lock, MapPin, ReceiptText } from "lucide-react";
import Link from "next/link";
import Install from "@/components/Install.tsx";
import Logo from "@/components/Logo.tsx";
import Scene from "@/components/Scene.tsx";
import Theme from "@/components/Theme.tsx";
import { ICONS, Slip } from "@/components/ui.tsx";
import { CATEGORIES, SERVICES } from "@/lib/catalog.ts";
import { CANCEL_FEE, MAX_CANCELS, OWE_LIMIT } from "@/lib/engine.ts";
import { money } from "@/lib/format.ts";
import { calcEstimate, COMMISSION } from "@/lib/pricing.ts";

const CUSTOMER = [
  ["Choose the job", "Pick a service and answer a few questions about size and materials. Add photos if they help."],
  ["See the estimate", "Compare verified workers. Each price shows labour, materials and travel before you book."],
  ["Agree a date", "Once the worker accepts, chat, call or use WhatsApp, then both of you approve the date."],
  ["Follow, confirm, pay", "Track the worker on the day, check the finished work, pay by cash or card, then leave a rating."],
];
const WORKER = [
  ["Create a worker account", "Use your name, email and phone number."],
  ["Send your documents", "Add your photo, national identity card or passport, experience, and any certificates."],
  ["Pick your services", "Choose every kind of work you can really do. You can change this later."],
  ["Get approved and accept jobs", "Our team checks your application. After approval, requests arrive in your app."],
];
const FAQ = [
  ["Is the price final?", "It is an estimate from your answers. If the job turns out different, the worker asks for a change and it only applies if you approve it."],
  ["Can I cancel?", `Yes. It is free for one hour after booking. After that, if a worker has already accepted, a ${money(CANCEL_FEE)} fee applies.`],
  ["Who can see my address and phone number?", "A worker sees only your town until they accept the booking."],
  ["When can I see the worker on the map?", "On the appointment date, after the worker sets off and turns on location sharing."],
  ["What if something goes wrong?", "Use “Report a problem” on the booking, up to 48 hours after completion. Our support team reviews it."],
];

export default function Landing() {
  const example = calcEstimate(SERVICES[0], { size: 150, points: 6, switches: 4, fixtures: 3, work: "new", built: "yes" }, 5);
  return (
    <div className="landing">
      <header className="top">
        <Logo word />
        <nav aria-label="Page"><a href="#how">How it works</a><a href="#workers">For workers</a><a href="#payments">Payments</a><a href="#faq">Questions</a></nav>
        <Theme /><Link className="btn dark" href="/login">Sign in</Link>
      </header>

      <section className="intro">
        <div>
          <h1>Skilled help,<br />at your door</h1>
          <p>GetItDone connects you with electricians, plumbers, builders, painters, carpenters and AC technicians. See an estimate first, then book.</p>
          <div className="actions"><Link className="btn" href="/login?role=customer">Book a worker</Link><Link className="btn ghost" href="/login?role=worker&mode=up">Join as a worker</Link></div>
        </div>
        <div className="window"><Scene /></div>
      </section>

      <section>
        <h2>What you can book</h2>
        <ul className="kinds">{CATEGORIES.map((c) => {
          const Icon = ICONS[c.id], from = Math.min(...SERVICES.filter((s) => s.category === c.id).map((s) => s.labour + s.material));
          return <li key={c.id}><i><Icon /></i><h3>{c.name}</h3><p>{c.blurb}</p><small>Estimates from {money(from)}</small></li>;
        })}</ul>
      </section>

      <section id="how" className="split">
        <div><h2>How booking works</h2><ol className="path">{CUSTOMER.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol></div>
        <figure><Slip estimate={example} /><figcaption>Example: new wiring in a 150 sq ft room, 5 km away.</figcaption></figure>
      </section>

      <section id="workers" className="join">
        <div><h2>Work with GetItDone</h2><p>Get requests that match your skills, with the job details and price shown before you accept.</p>
          <Link className="btn" href="/login?role=worker&mode=up">Join as a worker</Link></div>
        <ol className="path">{WORKER.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol>
        <dl className="rules">
          <div><dt>{COMMISSION * 100}%</dt><dd>commission on each completed job. Tips are yours.</dd></div>
          <div><dt>{MAX_CANCELS}</dt><dd>cancellations allowed a month. Each lowers your rating.</dd></div>
          <div><dt>{money(OWE_LIMIT)}</dt><dd>unpaid commission pauses new jobs until you pay.</dd></div>
        </dl>
      </section>

      <section id="payments">
        <h2>Paying for a job</h2>
        <div className="two">
          <article><Banknote /><h3>Cash</h3><p>Pay the worker when the work is done. The platform commission is recorded on the worker’s account, and they pay it by bank transfer.</p></article>
          <article><CreditCard /><h3>Card</h3><p>Confirm the work, then pay on PayHere’s secure page. GetItDone never sees your card number. The worker’s share is credited to them.</p></article>
        </div>
      </section>

      <section>
        <h2>Built to protect both sides</h2>
        <ul className="trust">
          <li><FileCheck2 /><h3>Checked workers</h3><p>Identity documents are reviewed before a worker can accept jobs.</p></li>
          <li><Lock /><h3>Private details</h3><p>Addresses and phone numbers are shared only after a booking is accepted.</p></li>
          <li><ReceiptText /><h3>Clear prices</h3><p>Every estimate is itemised, and changes need your approval.</p></li>
          <li><MapPin /><h3>Location on your terms</h3><p>Workers choose to share it, only for the trip to your job.</p></li>
        </ul>
      </section>

      <section id="faq"><h2>Common questions</h2>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>

      <section className="closer">
        <Logo size={72} /><h2>Keep GetItDone on your phone</h2><p>Install it on Android, iPhone or your computer.</p>
        <Install /><Link className="btn" href="/login">Open GetItDone</Link>
      </section>
      <footer><Logo word /><small>Skilled workers for homes and building sites.</small></footer>
    </div>
  );
}
