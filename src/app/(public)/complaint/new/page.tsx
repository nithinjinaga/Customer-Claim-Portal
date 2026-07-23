import Wizard from "./wizard";

export const metadata = { title: "Raise a complaint · Premier Energies" };

export default function NewComplaintPage() {
  return (
    <div className="complaint-page">
      <Wizard />
    </div>
  );
}
