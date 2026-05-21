import { signOut } from 'firebase/auth'
import { auth } from '~/services/firebase'
import PhotoUploader from '~/components/admin/PhotoUploader'
import MessageComposer from '~/components/admin/MessageComposer'

import './Dashboard.css';

function Dashboard() {
  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <div className='dashboard__header'>
        <h1>Photo Portal Admin Dashboard</h1>
        <button onClick={() => { void handleSignOut() }} style={{ padding: '0.5rem 1rem' }}>
          Sign Out
        </button>
      </div>

      <div className='dashboard__content grid-container'>
        <div className="col-mobile-12 col-tablet-6 col-desktop-6">
          <h2>Upload Photos</h2>
          <PhotoUploader />
        </div>

        <div className="col-mobile-12 col-tablet-6 col-desktop-6">
          <h2>Send Message</h2>
          <MessageComposer />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
