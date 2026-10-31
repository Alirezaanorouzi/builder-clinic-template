export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <header
        style={{
          marginBottom: 40,
          textAlign: "center",
          padding: "24px 16px",
          backgroundColor: "#f0f7ff",
          borderRadius: 16,
        }}
      >
        <p
          style={{
            color: "#0d6efd",
            fontWeight: 700,
            margin: 0,
            fontSize: "1.1rem",
            letterSpacing: "0.04em",
          }}
        >
          Care Clinic
        </p>
        <h1 style={{ fontSize: "2.25rem", margin: "8px 0", fontWeight: 700 }}>
          Your Health, Our Priority
        </h1>
        <p style={{ color: "#555", lineHeight: 1.6, margin: 0, fontSize: "1.05rem" }}>
          Compassionate, comprehensive healthcare for the whole family.
        </p>
      </header>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.25rem" }}>Hours</h2>
        <p>Mon–Fri: 9:00 – 18:00</p>
        <p>Sat: 10:00 – 14:00</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.25rem" }}>Contact</h2>
        <p>Phone: (555) 010-0200</p>
        <p>Email: hello@careclinic.example</p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.25rem" }}>Services</h2>
        <ul>
          <li>General checkups</li>
          <li>Preventive care</li>
          <li>Consultations</li>
        </ul>
      </section>
    </main>
  );
}
