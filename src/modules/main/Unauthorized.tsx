import { useNavigate } from 'react-router-dom'
import { RouteNames } from '../../router/routes'
import styles from './styles/unauthorized.module.css'

export const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <button className={styles.button} onClick={() => navigate(RouteNames.LOGIN)}>
        Sign in
      </button>
    </div>
  )
}
