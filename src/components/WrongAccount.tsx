import { signOut } from 'firebase/auth'
import { auth } from '~/services/firebase'

interface WrongAccountProps {
  expected: 'admin' | 'device'
  actualEmail: string | null
}

const SURFACE_LABEL: Record<WrongAccountProps['expected'], string> = {
  admin: 'admin portal',
  device: 'device app',
}

const OTHER_SURFACE_LABEL: Record<WrongAccountProps['expected'], string> = {
  admin: 'device account',
  device: 'admin account',
}

/**
 * Shown when a user is authenticated but with the wrong account for the
 * current surface (e.g. signed in as the device account on /admin). Forces a
 * sign-out before they can continue, so subsequent actions don't fail
 * cryptically against storage.rules.
 */
export default function WrongAccount({ expected, actualEmail }: WrongAccountProps) {
  const surface = SURFACE_LABEL[expected]
  const otherSurface = OTHER_SURFACE_LABEL[expected]

  const handleSignOut = () => {
    void signOut(auth)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 560, margin: '4rem auto', fontFamily: 'inherit' }}>
      <h2 style={{ marginTop: 0 }}>Wrong account</h2>
      <p>
        This is the <strong>{surface}</strong>, but you&rsquo;re signed in as{' '}
        <code>{actualEmail ?? 'an unknown account'}</code>{' '}
        ({otherSurface}).
      </p>
      <p>Sign out and sign back in with the {expected} account to continue.</p>
      <button
        onClick={handleSignOut}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.25rem',
          fontSize: '1rem',
          backgroundColor: '#039be5',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  )
}
