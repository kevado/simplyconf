# SimplyConf - Conference Management System

A comprehensive WordPress plugin for managing academic conferences, abstract submissions, peer reviews, and event registration.

## Features

### Core Functionality
- **Event & Track Management**: Create and manage multiple conferences with customizable tracks and settings
- **Abstract Submissions**: Full-featured submission system with custom fields and file uploads
- **User Management**: Role-based access control with track chairs, reviewers, and authors

### Advanced Features
- **Custom Fields**: Flexible form builder for abstracts, reviews, and user profiles
- **File Attachments**: Secure file upload and management system
- **Dynamic Statuses**: Configurable workflow states for abstracts and reviews
- **Email Notifications**: Automated email system with customizable templates
- **Multi-language Support**: Full internationalization with 10+ languages
- **REST API**: Complete API for external integrations

## Installation

### Requirements
- WordPress 5.0 or higher
- PHP 7.4 or higher
- MySQL 5.6 or higher

### Installation Steps
1. Download the plugin files
2. Upload the `simplyconf` folder to `/wp-content/plugins/`
3. Activate the plugin through the WordPress admin dashboard
4. Access the SimplyConf menu to configure your first event

### Add-ons
SimplyConf supports optional add-ons for extended functionality:

- **SimplyConf Emails**: Advanced email template system
- **SimplyConf Payments**: Payment processing and registration fees
- **SimplyConf Reviews**: Enhanced review management tools
- **SimplyConf Exports**: Advanced export capabilities
- **SimplyConf Schedules**: Conference scheduling and agenda tools

## Configuration

### Basic Setup
1. Navigate to **SimplyConf > Events** in your WordPress admin
2. Create a new event or edit the default event
3. Configure event settings, deadlines, and requirements
4. Set up tracks and sessions as needed

### User Roles
- **Administrator**: Full access to all features
- **Track Chair**: Manage assigned tracks and reviewers
- **Reviewer**: Review assigned abstracts
- **Author**: Submit and manage abstracts

## Usage

### For Authors
1. Register for an account or log in
2. Submit abstracts through the frontend form
3. Upload supporting documents
4. Track submission status and review progress

### For Reviewers
1. Access assigned abstracts in the dashboard
2. Complete review forms with ratings and comments
3. Submit reviews with recommendations

### For Administrators
1. Manage events, tracks, and sessions
2. Configure settings and custom fields
3. Assign reviewers and track chairs
4. Monitor submission and review progress
5. Generate reports and exports

## Development

### Project Structure
```
simplyconf/
├── src/                    # React application source
├── inc/                    # PHP includes and core logic
├── classes/               # PHP classes
├── routes/                # REST API endpoints
├── languages/             # Translation files
├── assets/                # Static assets
└── scripts/               # Build and development scripts
```

### Building
```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Translation build
npm run i18n:build
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## API Reference

### REST API Endpoints
- `/wp-json/simplyconf/v1/events` - Event management
- `/wp-json/simplyconf/v1/abstracts` - Abstract operations
- `/wp-json/simplyconf/v1/reviews` - Review management
- `/wp-json/simplyconf/v1/users` - User management

### PHP Hooks
- `simplyconf_event_created` - Fired when an event is created
- `simplyconf_abstract_submitted` - Fired when an abstract is submitted
- `simplyconf_review_completed` - Fired when a review is completed

### JavaScript Hooks
- `simplyconf:abstract:saved` - Fired when an abstract is saved
- `simplyconf:review:submitted` - Fired when a review is submitted

## Support

### Documentation
- [User Guide](https://simplyconf.com/docs/)
- [Developer API](https://simplyconf.com/api/)
- [Video Tutorials](https://simplyconf.com/tutorials/)

### Community
- [WordPress.org Support Forum](https://wordpress.org/support/plugin/simplyconf/)
- [GitHub Repository](https://github.com/kevado/simplyconf)
- [GitHub Issues](https://github.com/kevado/simplyconf/issues)

## Changelog

### Version 1.0.0 (Current - Initial Release)
- Modern React-based admin interface with Redux state management
- Complete REST API for all operations and external integrations
- Advanced custom fields system with flexible form builder
- Secure file attachment management with version control
- Dynamic status workflows for abstracts and reviews
- Multi-language support with full internationalization
- Modular addon architecture for extended functionality
- Automated email notifications with customizable templates
- Payment processing integration with Stripe
- Enhanced security with JWT authentication
- Optimized database schema with proper indexing
- Comprehensive API documentation and developer tools

## License

This plugin is licensed under the GPL v2 or later.

## Credits

Developed by Kevon Adonis

---

SimplyConf - Making conference management simple and effective.
