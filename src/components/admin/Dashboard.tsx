import { signOut } from 'firebase/auth'
import { auth } from '../../services/firebase'
import PhotoUploader from './PhotoUploader'
import MessageComposer from './MessageComposer'

function Dashboard() {
  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Photo Portal Admin Dashboard</h1>
        <button onClick={() => { void handleSignOut() }} style={{ padding: '0.5rem 1rem' }}>
          Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h2>Upload Photos</h2>
          <PhotoUploader />
        </div>

        <div>
          <h2>Send Message</h2>
          <MessageComposer />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
